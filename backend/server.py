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
    clinical_team: str = ""
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
    accompaniment_staff_id: Optional[str] = None
    assigned_clinical_staff: List[dict] = Field(default_factory=list)  # [{type, staff_id, staff_name}]
    
class ClinicalStaffCreate(BaseModel):
    name: str
    role: str
    is_active: bool = True

class ClinicalStaffUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

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
    accompaniment_staff_id: Optional[str] = None
    assigned_clinical_staff: Optional[List[dict]] = None

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

class ClinicalTeamUpdate(BaseModel):
    clinical_team: str

class OriginServiceCreate(BaseModel):
    name: str
    is_active: bool = True

class OriginServiceUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class UserRoleUpdate(BaseModel):
    role: str

class DriverLicenseUpdate(BaseModel):
    license_expiry: str

# --- MODELOS BITÁCORA ---
class VehicleChecklist(BaseModel):
    vehicle_id: str
    fuel_level: str
    lights_ok: bool
    tires_ok: bool
    siren_ok: bool
    clean_interior: bool
    observations: str = ""

class FuelRecord(BaseModel):
    vehicle_id: str
    mileage: float
    liters: float
    amount: float
    receipt_number: str = ""

class IncidentRecord(BaseModel):
    vehicle_id: str
    incident_type: str
    description: str
    severity: str

# ============ AUTH UTILITIES ============

def create_token(data: dict, expires_delta: Optional[timedelta] = None):
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

# ============ ENDPOINTS GENERALES ============

@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing: raise HTTPException(status_code=400, detail="El correo ya esta registrado")
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
    await log_action(str(user["id"]), data.name, data.role, "registro", "usuario", str(user["id"]), f"Nuevo usuario registrado: {data.email}")
    return {"message": "Registro exitoso. Pendiente de aprobacion.", "user_id": user["id"]}

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
            "id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "shift_type": user.get("shift_type"), "extra_available": user.get("extra_available", False)
        }
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPassword):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user: return {"message": "Instrucciones enviadas."}
    reset_code = ''.join(random.choices(string.digits, k=6))
    await db.users.update_one({"id": user["id"]}, {"$set": {"reset_token": reset_code}})
    if resend_api_key:
        try:
            html_content = f"<h2>Recuperacion de Contrasena</h2><p>Codigo: <b>{reset_code}</b></p>"
            params = {"from": SENDER_EMAIL, "to": [data.email], "subject": "Recuperacion de Contrasena", "html": html_content}
            await asyncio.to_thread(resend.Emails.send, params)
        except Exception as e: pass
    return {"message": "Instrucciones enviadas", "reset_token": reset_code}

@api_router.post("/auth/reset-password")
async def reset_password(data: ResetPassword):
    user = await db.users.find_one({"reset_token": data.token})
    if not user: raise HTTPException(status_code=400, detail="Código inválido")
    new_hash = pwd_context.hash(data.new_password)
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_hash, "reset_token": None}})
    return {"message": "Contrasena actualizada"}

@api_router.put("/auth/change-password")
async def change_password(data: ChangePassword, user=Depends(get_current_user)):
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not pwd_context.verify(data.current_password, db_user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")
    new_hash = pwd_context.hash(data.new_password)
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_hash}})
    return {"message": "Contraseña actualizada exitosamente"}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

@api_router.get("/users")
async def list_users(user=Depends(require_roles("admin"))):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)

@api_router.put("/users/{user_id}/approve")
async def approve_user(user_id: str, user=Depends(require_roles("admin"))):
    await db.users.update_one({"id": user_id}, {"$set": {"status": "aprobado"}})
    return {"message": "Aprobado"}

@api_router.put("/users/{user_id}/reject")
async def reject_user(user_id: str, user=Depends(require_roles("admin"))):
    await db.users.update_one({"id": user_id}, {"$set": {"status": "rechazado"}})
    return {"message": "Rechazado"}

@api_router.put("/users/{user_id}/role")
async def update_role(user_id: str, data: UserRoleUpdate, user=Depends(require_roles("admin"))):
    await db.users.update_one({"id": user_id}, {"$set": {"role": data.role}})
    return {"message": "Rol actualizado"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user=Depends(require_roles("admin"))):
    await db.users.delete_one({"id": user_id})
    return {"message": "Eliminado"}

@api_router.get("/drivers")
async def list_drivers(user=Depends(require_roles("admin", "coordinador", "gestion_camas"))):
    return await db.users.find({"role": "conductor"}, {"_id": 0, "password_hash": 0}).to_list(1000)

@api_router.put("/drivers/{driver_id}/extra-availability")
async def toggle_extra_availability(driver_id: str, user=Depends(get_current_user)):
    driver = await db.users.find_one({"id": driver_id})
    new_val = not driver.get("extra_available", False)
    await db.users.update_one({"id": driver_id}, {"$set": {"extra_available": new_val}})
    return {"message": "Ok", "extra_available": new_val}

@api_router.put("/drivers/{driver_id}/license")
async def update_license(driver_id: str, data: DriverLicenseUpdate, user=Depends(require_roles("admin"))):
    await db.users.update_one({"id": driver_id, "role": "conductor"}, {"$set": {"license_expiry": data.license_expiry}})
    return {"message": "Ok"}

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

@api_router.put("/vehicles/{vehicle_id}")
async def update_vehicle(vehicle_id: str, data: VehicleCreate, user=Depends(require_roles("admin"))):
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": data.model_dump()})
    return {"message": "Ok"}

@api_router.put("/vehicles/{vehicle_id}/status")
async def update_vehicle_status(vehicle_id: str, data: VehicleStatusUpdate, user=Depends(require_roles("admin", "coordinador", "conductor"))):
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"status": data.status}})
    return {"message": "Ok"}

@api_router.put("/vehicles/{vehicle_id}/mileage")
async def update_vehicle_mileage(vehicle_id: str, data: VehicleMileageUpdate, user=Depends(require_roles("admin", "conductor"))):
    vehicle = await db.vehicles.find_one({"id": vehicle_id})
    next_maint = vehicle.get("next_maintenance_km", 10000)
    diff = next_maint - data.mileage
    alert = "rojo" if diff <= 0 else "amarillo" if diff <= 1000 else None
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": {"mileage": data.mileage, "maintenance_alert": alert}})
    return {"message": "Ok"}

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user=Depends(require_roles("admin"))):
    await db.vehicles.delete_one({"id": vehicle_id})
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

    initial_status = "pendiente"
    if data.trip_type == "clinico" and user["role"] == "solicitante":
        initial_status = "revision_gestor"

    trip = {
        "id": str(uuid.uuid4()), "tracking_number": folio, "requester_id": user["id"], "requester_name": user["name"],
        "driver_id": None, "driver_name": None, "origin": data.origin, "destination": data.destination,
        "patient_name": data.patient_name, "patient_unit": data.patient_unit, "priority": data.priority,
        "status": initial_status, "group_id": None, "order_in_group": 0, "notes": data.notes, "trip_type": data.trip_type,
        "scheduled_date": data.scheduled_date or datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "vehicle_id": None, "start_mileage": None, "end_mileage": None,
        "created_at": datetime.now(timezone.utc).isoformat(), "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None, "rut": data.rut, "age": data.age, "diagnosis": data.diagnosis, "weight": data.weight,
        "bed": data.bed, "transfer_reason": data.transfer_reason, "requester_person": user["name"],
        "attending_physician": data.attending_physician, "appointment_time": data.appointment_time, "departure_time": data.departure_time,
        "required_personnel": data.required_personnel, "patient_requirements": data.patient_requirements,
        "accompaniment": data.accompaniment, "accompaniment_staff_id": data.accompaniment_staff_id,
        "task_details": data.task_details, "staff_count": data.staff_count,
        "clinical_team": data.clinical_team,
        "assigned_clinical_staff": data.assigned_clinical_staff,
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

@api_router.get("/trips/gestion_revision")
async def trips_for_gestion_revision(user=Depends(require_roles("gestion_camas", "admin"))):
    return await db.trips.find({"status": "revision_gestor"}, {"_id": 0}).sort("created_at", -1).to_list(1000)

@api_router.put("/trips/{trip_id}/approve-gestor")
async def approve_trip_gestor(trip_id: str, data: TripUpdate, user=Depends(require_roles("gestion_camas", "admin"))):
    trip = await db.trips.find_one({"id": trip_id})
    if not trip: raise HTTPException(status_code=404, detail="Viaje no encontrado")
    if trip.get("status") != "revision_gestor":
        raise HTTPException(status_code=400, detail="El viaje no está en revisión")
        
    update_data = {
        "status": "pendiente",
        "priority": data.priority or trip.get("priority"),
        "clinical_team": data.clinical_team or trip.get("clinical_team"),
        "accompaniment_staff_id": data.accompaniment_staff_id or trip.get("accompaniment_staff_id"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    
    # Send a notification action to the audit logs
    await log_action(user["id"], user["name"], user["role"], "aprobar", "traslado", trip["id"], f"Folio {trip['tracking_number']} aprobado por gestor")
    
    return {"message": "Viaje aprobado correctamente"}

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

# --- AQUI AGREGAMOS PERMISO PARA EL CALENDARIO ---
@api_router.get("/trips/calendar")
async def trips_calendar(start_date: str = None, end_date: str = None, user=Depends(require_roles("coordinador", "admin", "gestion_camas"))):
    query = {"status": {"$ne": "cancelado"}}
    if start_date and end_date: query["scheduled_date"] = {"$gte": start_date, "$lte": end_date}
    return await db.trips.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(1000)

@api_router.put("/trips/reorder")
async def reorder_trips(data: TripReorder, user=Depends(require_roles("coordinador", "admin", "gestion_camas"))):
    for i, t_id in enumerate(data.trip_ids):
        await db.trips.update_one({"id": t_id}, {"$set": {"order_in_group": i}})
    return {"message": "Ok"}

@api_router.get("/trips/by-vehicle")
async def trips_by_vehicle(date: str = None, user=Depends(require_roles("coordinador", "admin", "gestion_camas"))):
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    vehicles = await db.vehicles.find({}, {"_id": 0}).to_list(500)
    trips = await db.trips.find({"scheduled_date": target_date, "status": {"$ne": "cancelado"}}, {"_id": 0}).sort("order_in_group", 1).to_list(5000)
    res = [{"vehicle": v, "trips": [t for t in trips if t.get("vehicle_id") == v["id"]]} for v in vehicles]
    unassigned = [t for t in trips if not t.get("vehicle_id")]
    if unassigned: res.append({"vehicle": {"id": "unassigned", "plate": "Sin Vehiculo"}, "trips": unassigned})
    return res

@api_router.get("/trips/by-driver")
async def trips_by_driver(date: str = None, user=Depends(require_roles("coordinador", "admin", "gestion_camas"))):
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    drivers = await db.users.find({"role": "conductor", "is_approved": True}, {"id": 1, "name": 1, "_id": 0}).to_list(500)
    trips = await db.trips.find({"scheduled_date": target_date, "status": {"$ne": "cancelado"}}, {"_id": 0}).sort("order_in_group", 1).to_list(5000)
    
    res = []
    for d in drivers:
        driver_trips = [t for t in trips if t.get("driver_id") == d["id"]]
        res.append({"driver": d, "trips": driver_trips})
        
    unassigned = [t for t in trips if not t.get("driver_id")]
    if unassigned: 
        res.append({"driver": {"id": "unassigned", "name": "Sin Conductor"}, "trips": unassigned})
        
    return res


@api_router.get("/trips/{trip_id}")
async def get_trip_detail(trip_id: str, user=Depends(get_current_user)):
    return await db.trips.find_one({"id": trip_id}, {"_id": 0})

@api_router.put("/trips/{trip_id}")
async def edit_trip(trip_id: str, data: TripUpdate, user=Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    return {"message": "Viaje actualizado"}

@api_router.put("/trips/{trip_id}/manager-assign")
async def manager_assign_trip(trip_id: str, data: ManagerAssign, user=Depends(require_roles("coordinador", "admin", "gestion_camas"))):
    driver = await db.users.find_one({"id": data.driver_id, "role": "conductor"}, {"_id": 0})
    update_data = {"driver_id": data.driver_id, "driver_name": driver["name"], "status": "asignado"}
    if data.vehicle_id: update_data["vehicle_id"] = data.vehicle_id
    await db.trips.update_one({"id": trip_id}, {"$set": update_data})
    return {"message": "Asignado"}

@api_router.put("/trips/{trip_id}/unassign")
async def unassign_trip(trip_id: str, user=Depends(require_roles("coordinador", "admin", "conductor", "gestion_camas"))): 
    await db.trips.update_one({"id": trip_id}, {"$set": {"status": "pendiente", "driver_id": None, "driver_name": None, "vehicle_id": None}})
    return {"message": "Desasignado"}
    
@api_router.put("/trips/{trip_id}/assign")
async def assign_trip(trip_id: str, user=Depends(require_roles("conductor"))):
    await db.trips.update_one({"id": trip_id}, {"$set": {"driver_id": user["id"], "driver_name": user["name"], "status": "asignado"}})
    return {"message": "Asignado"}

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

@api_router.put("/trips/{trip_id}/group")
async def group_trip(trip_id: str, data: TripGroupUpdate, user=Depends(require_roles("conductor"))):
    await db.trips.update_one({"id": trip_id}, {"$set": {"group_id": data.group_id, "order_in_group": data.order_in_group}})
    return {"message": "Ok"}

# ============ ENDPOINTS BITÁCORA ============

@api_router.post("/logbook/checklist")
async def create_checklist(data: VehicleChecklist, user=Depends(require_roles("conductor"))):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["driver_id"] = user["id"]
    doc["driver_name"] = user["name"]
    doc["timestamp"] = datetime.now(timezone.utc).isoformat()
    doc["type"] = "checklist"
    await db.logbook.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.post("/logbook/fuel")
async def create_fuel_record(data: FuelRecord, user=Depends(require_roles("conductor"))):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["driver_id"] = user["id"]
    doc["driver_name"] = user["name"]
    doc["timestamp"] = datetime.now(timezone.utc).isoformat()
    doc["type"] = "fuel"
    
    vehicle = await db.vehicles.find_one({"id": data.vehicle_id})
    if vehicle and data.mileage < vehicle.get("mileage", 0):
        raise HTTPException(status_code=400, detail=f"Error Crítico: Kilometraje ingresado ({data.mileage}) es menor al de la ambulancia ({vehicle.get('mileage', 0)}).")
    
    await db.vehicles.update_one({"id": data.vehicle_id}, {"$set": {"mileage": data.mileage}})
    await db.logbook.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.post("/logbook/incident")
async def create_incident(data: IncidentRecord, user=Depends(require_roles("conductor"))):
    doc = data.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["driver_id"] = user["id"]
    doc["driver_name"] = user["name"]
    doc["timestamp"] = datetime.now(timezone.utc).isoformat()
    doc["type"] = "incident"
    await db.logbook.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/logbook/{vehicle_id}")
async def get_vehicle_logbook(vehicle_id: str, date: str = None, user=Depends(get_current_user)):
    target_date = date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    trips = await db.trips.find({
        "vehicle_id": vehicle_id, 
        "scheduled_date": target_date,
        "status": {"$ne": "cancelado"}
    }, {"_id": 0}).to_list(100)
    
    logs = await db.logbook.find({
        "vehicle_id": vehicle_id,
        "timestamp": {"$regex": f"^{target_date}"}
    }, {"_id": 0}).to_list(100)
    
    return {"trips": trips, "logs": logs}

# ============ OTHER ENDPOINTS ============

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

@api_router.get("/audit-logs")
async def get_audit_logs(user=Depends(require_roles("admin"))):
    return await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(5000)

@api_router.post("/seed-admin")
async def seed_admin():
    if not await db.users.find_one({"role": "admin"}):
        await db.users.insert_one({"id": str(uuid.uuid4()), "email": "admin@hospital.cl", "password_hash": pwd_context.hash("admin123"), "name": "Administrador", "role": "admin", "status": "aprobado", "created_at": datetime.now(timezone.utc).isoformat()})
    return {"message": "Ok"}

@api_router.get("/clinical-staff")
async def list_clinical_staff(user=Depends(get_current_user)):
    return await db.clinical_staff.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/clinical-staff")
async def create_clinical_staff(data: ClinicalStaffCreate, user=Depends(require_roles("admin", "gestion_camas"))):
    staff = data.model_dump()
    staff["id"] = str(uuid.uuid4())
    staff["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.clinical_staff.insert_one(staff)
    staff.pop("_id", None)
    return staff

@api_router.put("/clinical-staff/{staff_id}")
async def update_clinical_staff(staff_id: str, data: ClinicalStaffUpdate, user=Depends(require_roles("admin", "gestion_camas"))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        return {"message": "Sin cambios"}
    await db.clinical_staff.update_one({"id": staff_id}, {"$set": update_data})
    return {"message": "Personal clínico actualizado"}

@api_router.delete("/clinical-staff/{staff_id}")
async def delete_clinical_staff(staff_id: str, user=Depends(require_roles("admin", "gestion_camas"))):
    await db.clinical_staff.delete_one({"id": staff_id})
    return {"message": "Personal clínico eliminado"}

# ============ ORIGIN SERVICES CRUD ============

@api_router.get("/origin-services")
async def list_origin_services(user=Depends(get_current_user)):
    return await db.origin_services.find({}, {"_id": 0}).to_list(1000)

@api_router.post("/origin-services")
async def create_origin_service(data: OriginServiceCreate, user=Depends(require_roles("admin", "gestion_camas"))):
    service = data.model_dump()
    service["id"] = str(uuid.uuid4())
    service["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.origin_services.insert_one(service)
    service.pop("_id", None)
    return service

@api_router.put("/origin-services/{service_id}")
async def update_origin_service(service_id: str, data: OriginServiceUpdate, user=Depends(require_roles("admin", "gestion_camas"))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        return {"message": "Sin cambios"}
    await db.origin_services.update_one({"id": service_id}, {"$set": update_data})
    return {"message": "Servicio actualizado"}

@api_router.delete("/origin-services/{service_id}")
async def delete_origin_service(service_id: str, user=Depends(require_roles("admin", "gestion_camas"))):
    await db.origin_services.delete_one({"id": service_id})
    return {"message": "Servicio eliminado"}

# ============ RUT VALIDATION ============

@api_router.get("/validate-rut/{rut}")
async def validate_rut(rut: str):
    """Validate Chilean RUT using modulo 11 algorithm"""
    clean = rut.replace(".", "").replace("-", "").upper().strip()
    if len(clean) < 2:
        return {"valid": False, "formatted": rut}
    body = clean[:-1]
    dv = clean[-1]
    if not body.isdigit():
        return {"valid": False, "formatted": rut}
    total = 0
    factor = 2
    for digit in reversed(body):
        total += int(digit) * factor
        factor = factor + 1 if factor < 7 else 2
    remainder = 11 - (total % 11)
    if remainder == 11:
        expected = "0"
    elif remainder == 10:
        expected = "K"
    else:
        expected = str(remainder)
    valid = dv == expected
    # Format: XX.XXX.XXX-X
    formatted_body = ""
    for i, ch in enumerate(reversed(body)):
        if i > 0 and i % 3 == 0:
            formatted_body = "." + formatted_body
        formatted_body = ch + formatted_body
    formatted = f"{formatted_body}-{expected}"
    return {"valid": valid, "formatted": formatted}

# ============ DRIVER HISTORY ============

@api_router.get("/trips/driver-history")
async def driver_history(user=Depends(require_roles("conductor"))):
    trips = await db.trips.find(
        {"driver_id": user["id"], "status": {"$in": ["completado", "cancelado"]}},
        {"_id": 0}
    ).sort("completed_at", -1).to_list(1000)
    return trips

# ============ COORDINATOR DASHBOARD STATS ============

@api_router.get("/stats/dashboard")
async def dashboard_stats(user=Depends(require_roles("coordinador", "admin", "gestion_camas"))):
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    # Start of week (Monday)
    start_of_week = (now - timedelta(days=now.weekday())).strftime("%Y-%m-%d")
    # Start of month
    start_of_month = now.strftime("%Y-%m-01")

    completed_today = await db.trips.count_documents({"status": "completado", "scheduled_date": today})
    completed_week = await db.trips.count_documents({"status": "completado", "scheduled_date": {"$gte": start_of_week, "$lte": today}})
    completed_month = await db.trips.count_documents({"status": "completado", "scheduled_date": {"$gte": start_of_month, "$lte": today}})

    total_all = await db.trips.count_documents({})
    by_status = {
        "pendiente": await db.trips.count_documents({"status": "pendiente"}),
        "revision_gestor": await db.trips.count_documents({"status": "revision_gestor"}),
        "asignado": await db.trips.count_documents({"status": "asignado"}),
        "en_curso": await db.trips.count_documents({"status": "en_curso"}),
        "completado": await db.trips.count_documents({"status": "completado"}),
        "cancelado": await db.trips.count_documents({"status": "cancelado"}),
    }

    active_drivers = await db.users.count_documents({"role": "conductor", "status": "aprobado"})
    # Drivers currently on a trip
    busy_driver_ids = await db.trips.distinct("driver_id", {"status": "en_curso"})
    busy_drivers = len([d for d in busy_driver_ids if d])

    # Average trip duration (from trips that have both start and completed_at)
    completed_trips = await db.trips.find(
        {"status": "completado", "start_mileage": {"$ne": None}, "end_mileage": {"$ne": None}},
        {"_id": 0, "start_mileage": 1, "end_mileage": 1}
    ).to_list(500)
    avg_km = 0
    if completed_trips:
        distances = [t["end_mileage"] - t["start_mileage"] for t in completed_trips if t.get("end_mileage") and t.get("start_mileage")]
        avg_km = round(sum(distances) / len(distances), 1) if distances else 0

    return {
        "completed_today": completed_today,
        "completed_week": completed_week,
        "completed_month": completed_month,
        "total_all": total_all,
        "by_status": by_status,
        "active_drivers": active_drivers,
        "busy_drivers": busy_drivers,
        "avg_km_per_trip": avg_km,
    }

# ============ CORS CONFIGURATION ============
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "https://movilizacion-hcu.onrender.com",
        "https://test-movilizacion.onrender.com",
        "https://movilizacion-hcu-backend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
