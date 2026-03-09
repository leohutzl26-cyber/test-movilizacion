import asyncio
import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MONGO_URL = "mongodb+srv://admin:admin123@cluster0.aezo66y.mongodb.net/?appName=Cluster0"

async def seed():
    client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
    db = client.get_database("movilizacion")

    users = [
        {"email": "admin@test.cl", "role": "admin", "name": "Test Admin"},
        {"email": "gestor@test.cl", "role": "gestion_camas", "name": "Test Gestor"},
        {"email": "solicitante@test.cl", "role": "solicitante", "name": "Test Solicitante"},
        {"email": "coordinador@test.cl", "role": "coordinador", "name": "Test Coordinador"},
        {"email": "driver@test.cl", "role": "conductor", "name": "Test Driver"},
    ]

    for u in users:
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "email": u["email"],
                "password_hash": pwd_context.hash("admin123"),
                "name": u["name"],
                "role": u["role"],
                "status": "aprobado",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            print(f"Created {u['email']}")
        else:
            print(f"User {u['email']} already exists")
    
    # Check for a vehicle
    existing_veh = await db.vehicles.find_one({"plate": "AB-12-34"})
    if not existing_veh:
        await db.vehicles.insert_one({
            "id": str(uuid.uuid4()),
            "plate": "AB-12-34",
            "brand": "Mercedes",
            "model": "Sprinter",
            "year": 2024,
            "mileage": 1000,
            "next_maintenance_km": 10000,
            "status": "disponible",
            "passenger_capacity": 5,
            "load_capacity": 1000,
            "assigned_driver_id": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        print("Created test vehicle")

if __name__ == "__main__":
    asyncio.run(seed())
