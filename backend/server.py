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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

resend_api_key = os.environ.get('RESEND_API_KEY')
if resend_api_key:
    resend.api_key = resend_api_key
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

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

class ChangePassword(BaseModel):
    current_password: str
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
    clinical_team: str = "" # Este es el campo que usará Gestión de Camas para los nombres
    contact_person: str = ""
    scheduled_date: str = ""
    rut: str = ""
    age: str = ""
    diagnosis: str = ""
    weight: str = ""
    bed: str = ""
    transfer_reason: str = ""
    requester_person: str = ""
    attending_physician: str = ""
    appointment_time: str = ""
    departure_time: str = ""
    required_personnel: List[str] = Field(default_factory=list)
    patient_requirements: List[str] = Field(default_factory=list)
    accompaniment: str = ""
    task_details: str = ""
    staff_count: str = ""

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
    scheduled_date: Optional[str] = None
    clinical_team: Optional[str] = None
    rut: Optional[str] = None
    age: Optional[str] = None
    diagnosis: Optional[str] = None
    weight: Optional[str] = None
    bed: Optional[str] = None
    transfer_reason: Optional[str] = None
    requester_person: Optional[str] = None
    attending_physician: Optional[str] = None
    appointment_time: Optional[str] = None
    departure_time: Optional[str] = None
    required_personnel: Optional[List[str]] = None
    patient_requirements: Optional[List[str]] = None
    accompaniment: Optional[str] = None
    task_details: Optional[str] = None
    staff_count: Optional[str] = None

class ManagerAssign(BaseModel):
    driver_id: str
    vehicle_id: Optional[str] = None

class DestinationCreate(BaseModel):
    name: str
    address: str = ""

class ClinicalTeamUpdate(BaseModel):
    clinical_team: str

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

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

# ============ USER & VEHICLE ENDPOINTS ============
@api_router.get("/users")
async def list_users(user=Depends(require_roles("admin"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)

@api_router.put("/users/{user_id}/approve")
async def approve_user(user_id: str, user=Depends(require_roles("admin"))):
    await db.users.update_one({"id": user_id}, {"$set": {"status": "aprobado"}})
    return {"message": "Aprobado"}

@api_router.put("/users/{user_id}/role")
async def update_role(user_id: str, data: UserRoleUpdate, user=Depends(require_roles("admin"))):
    await db.users.update_one({"id": user_id}, {"$set": {"role": data.role}})
    return {"message": "Rol actualizado"}

@api_router.get("/drivers")
async def list_drivers(user=Depends(require_roles("admin", "coordinador"))):
    return await db.users.find({"role": "conductor"}, {"_id": 0, "password_hash": 0}).to_list(1000)

@api_router.get("/vehicles")
async def list_vehicles(user=Depends(get_current_user)):
    return await db.vehicles.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/vehicles")
async def create_vehicle(data: VehicleCreate, user=Depends(require_roles("admin"))):
    vehicle = data.model_dump()
    vehicle["id"] = str(uuid.uuid4())
    vehicle["status"] = "disponible"
    vehicle["maintenance_alert"] = None
    vehicle["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.vehicles.insert_one(vehicle)
    vehicle.pop("_id", None)
    return vehicle

@api_router.put("/vehicles/{vehicle_id}/status")
async def update_vehicle_status(vehicle_id: str, data: VehicleStatusUpdate, user=Depends(require_roles("admin", "coordinador", "conductor"))):
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"status": data.status}})
    return {"message": "Ok"}

# ============ TRIP MANAGEMENT ============

@api_router.post("/trips")
async def create_trip(data: TripCreate, user=Depends(require_roles("solicitante", "coordinador", "admin"))):
    today_str = datetime.now(timezone.utc).strftime("%y%m%d")
    today_prefix = f"TR-{today_str}-"
    
    count_today = await db.trips.count_documents({"tracking_number": {"$regex": f"^{today_prefix}"}})
    sequential = count_today + 1
    folio = f"{today_prefix}{sequential:03d}"
    
    while await db.trips.find_one({"tracking_number": folio}):
        sequential += 1
        folio = f"{today_prefix}{sequential:03d}"

    trip = {
        "id": str(uuid.uuid4()),
        "tracking_number": folio,
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
        "scheduled_date": data.scheduled_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "vehicle_id": None,
        "start_mileage": None,
        "end_mileage": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        
        "rut": data.rut,
        "age": data.age,
        "diagnosis": data.diagnosis,
        "weight": data.weight,
        "bed": data.bed,
        "transfer_reason": data.transfer_reason,
        "requester_person": data.requester_person,
        "attending_physician": data.attending_physician,
        "appointment_time": data.appointment_time,
        "departure_time": data.departure_time,
        "required_personnel": data.required_personnel,
        "patient_requirements": data.patient_requirements,
        "accompaniment": data.accompaniment,
        "task_details": data.task_details,
        "staff_count": data.staff_count,
        "clinical_team": data.clinical_team, # <- Nombre asignado
    }
    await db.trips.insert_one(trip)
    trip.pop("_id", None)
    await log_action(user["id"], user["name"], user["role"], "crear_traslado", "traslado", trip["id"], f"Folio {folio}: {data.origin} -> {data.destination}")
    return trip

@api_router.get("/trips")
async def list_trips(user=Depends(get_current_user)):
    query = {}
    if user["role"] == "solicitante": query["requester_id"] = user["id"]
    elif user["role"] == "conductor": query["driver_id"] = user["id"]
    return await db.trips.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/trips/pool")
async def trip_pool(user=Depends(require_roles("conductor", "coordinador", "gestion_camas"))):
    return await db.trips.find({"status": "pendiente", "driver_id": None}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/trips/active")
async def active_trips(user=Depends(require_roles("coordinador", "admin", "gestion_camas"))):
    return await db.trips.find({"status": {"$in": ["pendiente", "asignado", "en_curso"]}}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.get("/trips/history")
async def trips_history(user=Depends(require_roles("coordinador", "admin", "gestion_camas"))):
    trips = await db.trips.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    vehicle_ids = list(set(t.get("vehicle_id") for t in trips if t.get("vehicle_id")))
    vehicles_map = {v["id"]: v["plate"] for v in await db.vehicles.find({"id": {"$in": vehicle_ids}}, {"_id": 0, "id": 1, "plate": 1}).to_list(500)} if vehicle_ids else {}
    for t in trips: t["vehicle_plate"] = vehicles_map.get(t.get("vehicle_id"), "")
    return trips

@api_router.put("/trips/{trip_id}")
async def edit_trip(trip_id: str, data: TripUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    return {"message": "Viaje actualizado"}

@api_router.put("/trips/{trip_id}/manager-assign")
async def manager_assign_trip(trip_id: str, data: ManagerAssign, user=Depends(require_roles("coordinador", "admin"))):
    driver = await db.users.find_one({"id": data.driver_id, "role": "conductor"}, {"_id": 0})
    update_data = {"driver_id": data.driver_id, "driver_name": driver["name"], "status": "asignado"}
    if data.vehicle_id: update_data["vehicle_id"] = data.vehicle_id
    await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    return {"message": "Asignado"}

@api_router.put("/trips/{trip_id}/assign")
async def assign_trip(trip_id: str, user=Depends(require_roles("conductor"))):
    await db.trips.update_one({"id": trip_id}, {"$set": {"driver_id": user["id"], "driver_name": user["name"], "status": "asignado"}})
    return {"message": "Asignado"}

# NUEVA FUNCIÓN PARA GESTIÓN DE CAMAS
@api_router.put("/trips/{trip_id}/clinical-team")
async def assign_clinical_team(trip_id: str, data: ClinicalTeamUpdate, user=Depends(require_roles("admin", "coordinador", "gestion_camas", "solicitante"))):
    await db.trips.update_one({"id": trip_id}, {"$set": {"clinical_team": data.clinical_team, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Personal clínico asignado correctamente"}

@api_router.put("/trips/{trip_id}/status")
async def update_trip_status(trip_id: str, data: TripStatusUpdate, user=Depends(get_current_user)):
    trip = await db.trips.find_one({"id": trip_id})
    if not trip: raise HTTPException(status_code=404, detail="Viaje no encontrado")
    update_data = {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}
    if data.status == "cancelado" and data.cancel_reason: update_data["cancel_reason"] = data.cancel_reason
    if data.status == "completado": update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    if data.vehicle_id: update_data["vehicle_id"] = data.vehicle_id

    if data.status == "en_curso" and data.mileage is not None: 
        if data.vehicle_id:
            vehicle = await db.vehicles.find_one({"id": data.vehicle_id})
            if vehicle and data.mileage < vehicle.get("mileage", 0):
                raise HTTPException(status_code=400, detail=f"Error Crítico: El kilometraje inicial ({data.mileage} km) NO puede ser menor al actual registrado ({vehicle.get('mileage', 0)} km).")
            await db.vehicles.update_one({"id": data.vehicle_id}, {"$set": {"mileage": data.mileage}})
        update_data["start_mileage"] = data.mileage
        
    if data.status == "completado" and data.mileage is not None: 
        start_km = trip.get("start_mileage", 0)
        if data.mileage <= start_km:
            raise HTTPException(status_code=400, detail=f"Error Crítico: El kilometraje final ({data.mileage} km) debe ser mayor al inicial ({start_km} km).")
        recorrido = data.mileage - start_km
        if recorrido > 1400:
            raise HTTPException(status_code=400, detail=f"Alerta Anti-Error: Es imposible recorrer {recorrido} km en un solo viaje.")
        update_data["end_mileage"] = data.mileage
        veh_id = trip.get("vehicle_id") or data.vehicle_id
        if veh_id: await db.vehicles.update_one({"id": veh_id}, {"$set": {"mileage": data.mileage}})

    await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    return {"message": "Ok"}

@api_router.get("/destinations")
async def list_destinations(user=Depends(get_current_user)):
    return await db.destinations.find({}, {"_id": 0}).to_list(1000)

@api_router.get("/stats")
async def get_stats(user=Depends(require_roles("admin", "coordinador", "gestion_camas"))):
    return {
        "total_trips": await db.trips.count_documents({}),
        "pending_trips": await db.trips.count_documents({"status": "pendiente"}),
        "active_trips": await db.trips.count_documents({"status": {"$in": ["asignado", "en_curso"]}}),
        "completed_trips": await db.trips.count_documents({"status": "completado"}),
        "total_vehicles": await db.vehicles.count_documents({}),
        "vehicles_available": await db.vehicles.count_documents({"status": "disponible"}),
        "total_drivers": await db.users.count_documents({"role": "conductor", "status": "aprobado"}),
        "pending_users": await db.users.count_documents({"status": "pendiente"})
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["https://movilizacion-hcu.onrender.com", "http://localhost:3000", "https://test-movilizacion.onrender.com"], 
    allow_methods=["*"],
    allow_headers=["*"],
)
