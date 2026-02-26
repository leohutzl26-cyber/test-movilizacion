import google.generativeai as genai
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import uuid
import base64
import string
import random
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
SECRET_KEY = os.environ.get('JWT_SECRET', str(uuid.uuid4()))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Resend config
resend_api_key = os.environ.get('RESEND_API_KEY')
if resend_api_key:
    resend.api_key = resend_api_key
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Gemini Key para OCR
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

# FastAPI
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ PYDANTIC MODELS ============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "solicitante"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    token: str
    new_password: str

class VehicleCreate(BaseModel):
    plate: str
    brand: str
    model: str
    year: int = 2024
    mileage: float = 0
    next_maintenance_km: float = 10000

class VehicleStatusUpdate(BaseModel):
    status: str

class VehicleMileageUpdate(BaseModel):
    mileage: float

class TripCreate(BaseModel):
    origin: str
    destination: str
    patient_name: str = ""
    patient_unit: str = ""
    priority: str = "normal"
    notes: str = ""
    trip_type: str = "no_clinico"
    clinical_team: str = ""
    contact_person: str = ""
    scheduled_date: str = ""

class TripStatusUpdate(BaseModel):
    status: str
    mileage: Optional[float] = None
    vehicle_id: Optional[str] = None
    cancel_reason: Optional[str] = None
    
class TripGroupUpdate(BaseModel):
    group_id: str
    order_in_group: int = 0
    
class TripReorder(BaseModel):
    trip_ids: List[str]
    
class TripUpdate(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    patient_name: Optional[str] = None
    patient_unit: Optional[str] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    trip_type: Optional[str] = None
    clinical_team: Optional[str] = None
    contact_person: Optional[str] = None
    scheduled_date: Optional[str] = None

class ManagerAssign(BaseModel):
    driver_id: str
    vehicle_id: Optional[str] = None

class DestinationCreate(BaseModel):
    name: str
    address: str = ""

class DestinationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class UserRoleUpdate(BaseModel):
    role: str

class DriverLicenseUpdate(BaseModel):
    license_expiry: str

# ============ AUTH UTILITIES ============

def create_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=ACCESS_TOKEN_EXPIRE))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token invalido")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        if user.get("status") != "aprobado":
            raise HTTPException(status_code=403, detail="Usuario pendiente de aprobacion")
        if user.get("role") == "conductor" and user.get("license_expiry"):
            try:
                expiry = datetime.fromisoformat(user["license_expiry"])
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                if expiry < datetime.now(timezone.utc):
                    raise HTTPException(status_code=403, detail="Licencia de conducir vencida")
            except (ValueError, TypeError):
                pass
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalido o expirado")

def require_roles(*roles):
    async def role_checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="No tiene permisos para esta accion")
        return user
    return role_checker

# ============ AUDIT LOG HELPER ============

async def log_action(user_id: str, user_name: str, user_role: str, action: str, entity_type: str, entity_id: str = "", details: str = ""):
    entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_name": user_name,
        "user_role": user_role,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(entry)

# ============ AUTH ENDPOINTS ============

@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El correo ya esta registrado")
    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password_hash": pwd_context.hash(data.password),
        "name": data.name,
        "role": data.role,
        "status": "pendiente",
        "shift_type": None,
        "extra_available": False,
        "license_expiry": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    await log_action(user["id"], data.name, data.role, "registro", "usuario", user["id"], f"Nuevo usuario registrado: {data.email}")
    return {"message": "Registro exitoso. Pendiente de aprobacion por administrador.", "user_id": user["id"]}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    if user["status"] != "aprobado":
        raise HTTPException(status_code=403, detail="Cuenta pendiente de aprobacion")
    if user.get("role") == "conductor" and user.get("license_expiry"):
        try:
            expiry = datetime.fromisoformat(user["license_expiry"])
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            if expiry < datetime.now(timezone.utc):
                raise HTTPException(status_code=403, detail="Licencia de conducir vencida. Contacte al administrador.")
        except (ValueError, TypeError):
            pass
    token = create_token({"sub": user["id"], "role": user["role"]})
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "shift_type": user.get("shift_type"),
            "extra_available": user.get("extra_available", False)
        }
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPassword):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user:
        return {"message": "Si el correo existe, recibira instrucciones de recuperacion."}
        
    reset_code = ''.join(random.choices(string.digits, k=6))
    await db.users.update_one({"id": user["id"]}, {"$set": {"reset_token": reset_code}})
    
    if resend_api_key:
        try:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0F766E;">Recuperacion de Contrasena</h2>
                <p>Hola {user['name']},</p>
                <p>Recibimos una solicitud para restablecer tu contrasena. Usa el siguiente codigo:</p>
                <div style="background: #F1F5F9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <code style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0F766E;">{reset_code}</code>
                </div>
                <p style="color: #64748B; font-size: 12px;">Este codigo expira pronto.</p>
            </div>
            """
            params = {
                "from": SENDER_EMAIL,
                "to": [data.email],
                "subject": "Recuperacion de Contrasena - Traslados Hospital",
                "html": html_content
            }
            await asyncio.to_thread(resend.Emails.send, params)
        except Exception as e:
            logger.error(f"Error enviando email: {e}")
            
    return {"message": "Si el correo existe, recibira instrucciones de recuperacion.", "reset_token": reset_code}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPassword):
    user = await db.users.find_one({"reset_token": data.token})
    if not user:
        raise HTTPException(status_code=400, detail="Código de recuperación inválido o expirado")
        
    new_hash = pwd_context.hash(data.new_password)
    result = await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_hash, "reset_token": None}})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Error al actualizar contraseña")
    return {"message": "Contrasena actualizada correctamente"}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

# ============ USER MANAGEMENT ============

@api_router.get("/users")
async def list_users(user=Depends(require_roles("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0, "reset_token": 0}).to_list(1000)
    return users

@api_router.put("/users/{user_id}/approve")
async def approve_user(user_id: str, user=Depends(require_roles("admin"))):
    result = await db.users.update_one({"id": user_id}, {"$set": {"status": "aprobado"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    target = await db.users.find_one({"id": user_id}, {"_id": 0})
    await log_action(user["id"], user["name"], user["role"], "aprobar_usuario", "usuario", user_id, f"Aprobado: {target['name'] if target else user_id}")
    return {"message": "Usuario aprobado"}

@api_router.put("/users/{user_id}/reject")
async def reject_user(user_id: str, user=Depends(require_roles("admin"))):
    result = await db.users.update_one({"id": user_id}, {"$set": {"status": "rechazado"}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await log_action(user["id"], user["name"], user["role"], "rechazar_usuario", "usuario", user_id, "")
    return {"message": "Usuario rechazado"}

@api_router.put("/users/{user_id}/role")
async def update_role(user_id: str, data: UserRoleUpdate, user=Depends(require_roles("admin"))):
    valid_roles = ["admin", "coordinador", "solicitante", "conductor"]
    if data.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Rol invalido")
    result = await db.users.update_one({"id": user_id}, {"$set": {"role": data.role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await log_action(user["id"], user["name"], user["role"], "cambiar_rol", "usuario", user_id, f"Nuevo rol: {data.role}")
    return {"message": "Rol actualizado"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_roles("admin"))):
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await log_action(user["id"], user["name"], user["role"], "eliminar_usuario", "usuario", user_id, "")
    return {"message": "Usuario eliminado"}

# ============ DRIVER MANAGEMENT ============

@api_router.get("/drivers")
async def list_drivers(user=Depends(require_roles("admin", "coordinador"))):
    drivers = await db.users.find({"role": "conductor"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return drivers

@api_router.put("/drivers/{driver_id}/extra-availability")
async def toggle_extra_availability(driver_id: str, user=Depends(get_current_user)):
    if user["id"] != driver_id and user["role"] not in ["admin", "coordinador"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    driver = await db.users.find_one({"id": driver_id, "role": "conductor"}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    new_val = not driver.get("extra_available", False)
    await db.users.update_one({"id": driver_id}, {"$set": {"extra_available": new_val}})
    return {"message": "Disponibilidad actualizada", "extra_available": new_val}

@api_router.put("/drivers/{driver_id}/license")
async def update_license(driver_id: str, data: DriverLicenseUpdate, user=Depends(require_roles("admin"))):
    result = await db.users.update_one({"id": driver_id, "role": "conductor"}, {"$set": {"license_expiry": data.license_expiry}})
