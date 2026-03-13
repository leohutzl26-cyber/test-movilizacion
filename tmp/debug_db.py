from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
from dotenv import load_dotenv
from pathlib import Path

async def check_trips():
    ROOT_DIR = Path(__file__).parent / "backend"
    load_dotenv(ROOT_DIR / '.env')
    
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("--- Trips with status 'completado' ---")
    trips = await db.trips.find({"status": "completado"}).to_list(10)
    for t in trips:
        print(f"ID: {t.get('id')}, Folio: {t.get('tracking_number')}, Status: {t.get('status')}, Driver: {t.get('driver_name')} ({t.get('driver_id')}), Completed At: {t.get('completed_at')}")
    
    print("\n--- Users (conductores) ---")
    users = await db.users.find({"role": "conductor"}).to_list(10)
    for u in users:
        print(f"ID: {u.get('id')}, Name: {u.get('name')}")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_trips())
