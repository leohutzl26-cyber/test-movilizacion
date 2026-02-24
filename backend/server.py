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

# Gemini Key para OCR (Cambiado de EMERGENT_LLM_KEY a GEMINI_API_KEY)
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
    reset_token = create_token({"sub": user["id"], "type": "reset"}, timedelta(hours=1))
    await db.users.update_one({"id": user["id"]}, {"$set": {"reset_token": reset_token}})
    if resend_api_key:
        try:
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #0F766E;">Recuperacion de Contrasena</h2>
                <p>Hola {user['name']},</p>
                <p>Recibimos una solicitud para restablecer tu contrasena. Usa el siguiente codigo:</p>
                <div style="background: #F1F5F9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <code style="font-size: 24px; font-weight: bold; color: #0F766E;">{reset_token[:20]}</code>
                </div>
                <p style="color: #64748B; font-size: 12px;">Este codigo expira en 1 hora.</p>
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
    return {"message": "Si el correo existe, recibira instrucciones de recuperacion.", "reset_token": reset_token}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPassword):
    try:
        payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id or payload.get("type") != "reset":
            raise HTTPException(status_code=400, detail="Token invalido")
    except JWTError:
        raise HTTPException(status_code=400, detail="Token invalido o expirado")
    new_hash = pwd_context.hash(data.new_password)
    result = await db.users.update_one({"id": user_id}, {"$set": {"password_hash": new_hash, "reset_token": None}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
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
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    return {"message": "Licencia actualizada"}

# ============ VEHICLE MANAGEMENT ============

@api_router.get("/vehicles")
async def list_vehicles(user=Depends(get_current_user)):
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(1000)
    return vehicles

@api_router.post("/vehicles")
async def create_vehicle(data: VehicleCreate, user=Depends(require_roles("admin"))):
    vehicle = {
        "id": str(uuid.uuid4()),
        "plate": data.plate,
        "brand": data.brand,
        "model": data.model,
        "year": data.year,
        "mileage": data.mileage,
        "next_maintenance_km": data.next_maintenance_km,
        "status": "disponible",
        "maintenance_alert": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vehicles.insert_one(vehicle)
    vehicle.pop("_id", None)
    await log_action(user["id"], user["name"], user["role"], "crear_vehiculo", "vehiculo", vehicle["id"], f"Patente: {data.plate}")
    return vehicle

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: VehicleCreate, user=Depends(require_roles("admin"))):
    update_data = data.model_dump()
    result = await db.vehicles.update_one({"id": vehicle_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    return {"message": "Vehiculo actualizado"}

@api_router.put("/vehicles/{vehicle_id}/status")
async def update_vehicle_status(vehicle_id: str, data: VehicleStatusUpdate, user=Depends(require_roles("admin", "coordinador", "conductor"))):
    valid_statuses = ["disponible", "en_servicio", "en_limpieza", "en_taller", "fuera_de_servicio"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Estado invalido")
    result = await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"status": data.status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    await log_action(user["id"], user["name"], user["role"], "cambiar_estado_vehiculo", "vehiculo", vehicle_id, f"Estado: {data.status}")
    return {"message": "Estado actualizado"}

@api_router.put("/vehicles/{vehicle_id}/mileage")
async def update_vehicle_mileage(vehicle_id: str, data: VehicleMileageUpdate, user=Depends(require_roles("admin", "conductor"))):
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    if data.mileage < vehicle.get("mileage", 0):
        raise HTTPException(status_code=400, detail="El kilometraje no puede ser menor al actual")
    next_maint = vehicle.get("next_maintenance_km", 10000)
    diff = next_maint - data.mileage
    alert = None
    if diff <= 0:
        alert = "rojo"
    elif diff <= 1000:
        alert = "amarillo"
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"mileage": data.mileage, "maintenance_alert": alert}})
    return {"message": "Kilometraje actualizado", "mileage": data.mileage, "maintenance_alert": alert}


@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user=Depends(require_roles("admin"))):
    result = await db.vehicles.delete_one({"id": vehicle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    await log_action(user["id"], user["name"], user["role"], "eliminar_vehiculo", "vehiculo", vehicle_id, "")
    return {"message": "Vehiculo eliminado"}

@api_router.post("/vehicles/{vehicle_id}/ocr")
async def ocr_odometer(vehicle_id: str, file: UploadFile = File(...), user=Depends(require_roles("conductor"))):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="OCR no configurado: Falta GEMINI_API_KEY")
    
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehiculo no encontrado")
    
    contents = await file.read()
    img_base64 = base64.b64encode(contents).decode("utf-8")
    
    try:
        # 1. Configurar Gemini
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')

        # 2. Preparar la imagen descubriendo el formato real
        content_type = file.content_type
        # Gemini solo soporta ciertos formatos, nos aseguramos que sea uno válido:
        if content_type not in ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]:
            content_type = "image/jpeg" # Por defecto si es desconocido
            
        image_data = {
            "mime_type": content_type,
            "data": img_base64
        }

        # 3. Prompt para el odómetro
        prompt = "Extract ONLY the odometer/mileage number from this vehicle dashboard image. Return ONLY the numeric value with no other text. If you cannot read it, return ERROR."
        
        # 4. Llamada asíncrona a Gemini
        response_ai = await model.generate_content_async([prompt, image_data])
        response_text = response_ai.text.strip()
        
        # Limpiar el resultado
        cleaned = response_text.replace(",", "").replace(".", "").replace(" ", "").lower().replace("km", "")
        
        if cleaned == "error":
             return {"mileage": None, "raw_response": response_text, "error": "No se pudo leer el kilometraje"}
             
        mileage_val = float(cleaned)
        alert = None
        
        if mileage_val >= vehicle.get("mileage", 0):
            next_maint = vehicle.get("next_maintenance_km", 10000)
            diff = next_maint - mileage_val
            if diff <= 0:
                alert = "rojo"
            elif diff <= 1000:
                alert = "amarillo"
            await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"mileage": mileage_val, "maintenance_alert": alert}})
            
        return {"mileage": mileage_val, "raw_response": response_text, "maintenance_alert": alert}
        
    except (ValueError, TypeError) as e:
        return {"mileage": None, "raw_response": "Error de procesamiento", "error": str(e)}
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail=f"Error en OCR: {str(e)}")
        
# ============ TRIP MANAGEMENT ============

@api_router.post("/trips")
async def create_trip(data: TripCreate, user=Depends(require_roles("solicitante", "coordinador", "admin"))):
    trip = {
        "id": str(uuid.uuid4()),
        "requester_id": user["id"],
        "requester_name": user["name"],
        "driver_id": None,
        "driver_name": None,
        "origin": data.origin,
        "destination": data.destination,
        "patient_name": data.patient_name,
        "patient_unit": data.patient_unit,
        "priority": data.priority,
        "status": "pendiente",
        "group_id": None,
        "order_in_group": 0,
        "notes": data.notes,
        "trip_type": data.trip_type,
        "clinical_team": data.clinical_team,
        "contact_person": data.contact_person,
        "scheduled_date": data.scheduled_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "vehicle_id": None,
        "start_mileage": None,
        "end_mileage": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None
    }
    await db.trips.insert_one(trip)
    trip.pop("_id", None)
    await log_action(user["id"], user["name"], user["role"], "crear_traslado", "traslado", trip["id"], f"{data.origin} -> {data.destination}")
    return trip

@api_router.get("/trips")
async def list_trips(user=Depends(get_current_user)):
    query = {}
    if user["role"] == "solicitante":
        query["requester_id"] = user["id"]
    elif user["role"] == "conductor":
        query["driver_id"] = user["id"]
    trips = await db.trips.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return trips

@api_router.get("/trips/pool")
async def trip_pool(user=Depends(require_roles("conductor", "coordinador"))):
    trips = await db.trips.find({"status": "pendiente", "driver_id": None}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return trips

@api_router.get("/trips/active")
async def active_trips(user=Depends(require_roles("coordinador", "admin"))):
    trips = await db.trips.find({"status": {"$in": ["pendiente", "asignado", "en_curso"]}}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return trips

@api_router.get("/trips/history")
async def trips_history(user=Depends(require_roles("coordinador", "admin"))):
    trips = await db.trips.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    # Enrich with vehicle plate
    vehicle_ids = list(set(t.get("vehicle_id") for t in trips if t.get("vehicle_id")))
    vehicles_map = {}
    if vehicle_ids:
        vehicles = await db.vehicles.find({"id": {"$in": vehicle_ids}}, {"_id": 0, "id": 1, "plate": 1}).to_list(500)
        vehicles_map = {v["id"]: v["plate"] for v in vehicles}
    for t in trips:
        t["vehicle_plate"] = vehicles_map.get(t.get("vehicle_id"), "")
    return trips

@api_router.get("/trips/calendar")
async def trips_calendar(start_date: str = None, end_date: str = None, user=Depends(require_roles("coordinador", "admin"))):
    query = {"status": {"$ne": "cancelado"}}
    if start_date and end_date:
        query["scheduled_date"] = {"$gte": start_date, "$lte": end_date}
    trips = await db.trips.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(1000)
    return trips

@api_router.put("/trips/reorder")
async def reorder_trips(data: TripReorder, user=Depends(require_roles("coordinador", "admin"))):
    # Recibimos la lista de IDs en el orden correcto y actualizamos su posición en la BD
    for index, trip_id in enumerate(data.trip_ids):
        await db.trips.update_one(
            {"id": trip_id}, 
            {"$set": {"order_in_group": index, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    return {"message": "Orden actualizado en la base de datos"}

@api_router.get("/trips/by-vehicle")
async def trips_by_vehicle(date: str = None, user=Depends(require_roles("coordinador", "admin"))):
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(500)
    trips = await db.trips.find({"scheduled_date": target_date, "status": {"$ne": "cancelado"}}, {"_id": 0}).sort("order_in_group", 1).to_list(5000)
    result = []
    for v in vehicles:
        v_trips = [t for t in trips if t.get("vehicle_id") == v["id"]]
        result.append({"vehicle": v, "trips": v_trips})
    # Also include unassigned trips (no vehicle)
    unassigned = [t for t in trips if not t.get("vehicle_id")]
    if unassigned:
        result.append({"vehicle": {"id": "unassigned", "plate": "Sin Vehiculo", "brand": "", "model": "", "status": ""}, "trips": unassigned})
    return result

@api_router.get("/trips/{trip_id}")
async def get_trip_detail(trip_id: str, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return trip

@api_router.put("/trips/{trip_id}")
async def edit_trip(trip_id: str, data: TripUpdate, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if trip["status"] not in ["pendiente"] and user["role"] == "solicitante":
        raise HTTPException(status_code=400, detail="Solo se pueden editar viajes pendientes")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    return {"message": "Viaje actualizado"}

@api_router.put("/trips/{trip_id}/manager-assign")
async def manager_assign_trip(trip_id: str, data: ManagerAssign, user=Depends(require_roles("coordinador", "admin"))):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    driver = await db.users.find_one({"id": data.driver_id, "role": "conductor"}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Conductor no encontrado")
    update_data = {
        "driver_id": data.driver_id,
        "driver_name": driver["name"],
        "status": "asignado" if trip["status"] == "pendiente" else trip["status"],
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if data.vehicle_id:
        vehicle = await db.vehicles.find_one({"id": data.vehicle_id}, {"_id": 0})
        if vehicle:
            update_data["vehicle_id"] = data.vehicle_id
    await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    await log_action(user["id"], user["name"], user["role"], "asignar_traslado", "traslado", trip_id, f"Asignado a {driver['name']}")
    return {"message": f"Viaje asignado a {driver['name']}"}

@api_router.put("/trips/{trip_id}/unassign")
async def unassign_trip(trip_id: str, user=Depends(require_roles("coordinador", "admin"))):
    trip = await db.trips.find_one({"id": trip_id})
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    
    # Regla de negocio: No tocar viajes completados
    if trip.get("status") == "completado":
        raise HTTPException(status_code=400, detail="No se puede desasignar un viaje que ya está completado")
        
    # Devolvemos el viaje a la bolsa limpiando al conductor y vehículo
    await db.trips.update_one(
        {"id": trip_id},
        {"$set": {
            "status": "pendiente",
            "driver_id": None,
            "driver_name": None,
            "vehicle_id": None,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Viaje devuelto a la bolsa"}
    
@api_router.put("/trips/{trip_id}/assign")
async def assign_trip(trip_id: str, user=Depends(require_roles("conductor"))):
    trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
    if not trip:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if trip["status"] != "pendiente" or trip["driver_id"] is not None:
        raise HTTPException(status_code=400, detail="El viaje ya fue asignado")
    await db.trips.update_one(
        {"id": trip_id},
        {"$set": {"driver_id": user["id"], "driver_name": user["name"], "status": "asignado", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    await log_action(user["id"], user["name"], user["role"], "tomar_traslado", "traslado", trip_id, "Auto-asignacion")
    return {"message": "Viaje asignado exitosamente"}

@api_router.put("/trips/{trip_id}/status")
async def update_trip_status(trip_id: str, data: TripStatusUpdate, user=Depends(get_current_user)):
    valid_statuses = ["pendiente", "asignado", "en_curso", "completado", "cancelado"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Estado invalido")
    # Conductor must provide vehicle_id when starting a trip
    if data.status == "en_curso" and user["role"] == "conductor" and not data.vehicle_id:
        trip = await db.trips.find_one({"id": trip_id}, {"_id": 0})
        if trip and not trip.get("vehicle_id"):
            raise HTTPException(status_code=400, detail="Debe seleccionar un vehiculo para iniciar el viaje")
    update_data = {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if data.status == "completado":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    if data.status == "en_curso" and data.mileage is not None:
        update_data["start_mileage"] = data.mileage
    if data.status == "completado" and data.mileage is not None:
        update_data["end_mileage"] = data.mileage
    if data.vehicle_id:
        update_data["vehicle_id"] = data.vehicle_id
    result = await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    await log_action(user["id"], user["name"], user["role"], "cambiar_estado_traslado", "traslado", trip_id, f"Estado: {data.status}")
    return {"message": "Estado actualizado"}

@api_router.put("/trips/{trip_id}/group")
async def group_trip(trip_id: str, data: TripGroupUpdate, user=Depends(require_roles("conductor"))):
    result = await db.trips.update_one(
        {"id": trip_id},
        {"$set": {"group_id": data.group_id, "order_in_group": data.order_in_group, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Viaje no encontrado")
    return {"message": "Grupo actualizado"}


    
# ============ DESTINATION MANAGEMENT ============

@api_router.get("/destinations")
async def list_destinations(user=Depends(get_current_user)):
    destinations = await db.destinations.find({}, {"_id": 0}).to_list(1000)
    return destinations

@api_router.post("/destinations")
async def create_destination(data: DestinationCreate, user=Depends(require_roles("admin", "coordinador"))):
    dest = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "address": data.address,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.destinations.insert_one(dest)
    dest.pop("_id", None)
    return dest

@api_router.put("/destinations/{dest_id}")
async def update_destination(dest_id: str, data: DestinationUpdate, user=Depends(require_roles("admin", "coordinador"))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Sin datos para actualizar")
    result = await db.destinations.update_one({"id": dest_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return {"message": "Destino actualizado"}

@api_router.delete("/destinations/{dest_id}")
async def delete_destination(dest_id: str, user=Depends(require_roles("admin"))):
    result = await db.destinations.delete_one({"id": dest_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Destino no encontrado")
    return {"message": "Destino eliminado"}

# ============ STATS ============

@api_router.get("/stats")
async def get_stats(user=Depends(require_roles("admin", "coordinador"))):
    total_trips = await db.trips.count_documents({})
    pending = await db.trips.count_documents({"status": "pendiente"})
    active = await db.trips.count_documents({"status": {"$in": ["asignado", "en_curso"]}})
    completed = await db.trips.count_documents({"status": "completado"})
    total_vehicles = await db.vehicles.count_documents({})
    vehicles_available = await db.vehicles.count_documents({"status": "disponible"})
    total_drivers = await db.users.count_documents({"role": "conductor", "status": "aprobado"})
    pending_users = await db.users.count_documents({"status": "pendiente"})
    return {
        "total_trips": total_trips,
        "pending_trips": pending,
        "active_trips": active,
        "completed_trips": completed,
        "total_vehicles": total_vehicles,
        "vehicles_available": vehicles_available,
        "total_drivers": total_drivers,
        "pending_users": pending_users
    }

# ============ AUDIT LOG ============

@api_router.get("/audit-logs")
async def get_audit_logs(user=Depends(require_roles("admin"))):
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(5000)
    return logs

# ============ SEED ADMIN ============

@api_router.post("/seed-admin")
async def seed_admin():
    existing = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if existing:
        return {"message": "Admin ya existe", "email": existing["email"]}
    admin_user = {
        "id": str(uuid.uuid4()),
        "email": "admin@hospital.cl",
        "password_hash": pwd_context.hash("admin123"),
        "name": "Administrador",
        "role": "admin",
        "status": "aprobado",
        "shift_type": None,
        "extra_available": False,
        "license_expiry": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_user)
    return {"message": "Admin creado", "email": "admin@hospital.cl", "password": "admin123"}

# ============ APP SETUP ============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["https://movilizacion-hcu.onrender.com", "http://localhost:3000"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
