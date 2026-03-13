from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import os
from dotenv import load_dotenv

async def check_db():
    load_dotenv('backend/.env')
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    print("--- TRIPS ---")
    async for trip in db.trips.find().limit(5):
        print(f"ID: {trip.get('id')}, Status: {trip.get('status')}, Driver: {trip.get('driver_name')} ({trip.get('driver_id')})")
    
    print("\n--- USERS (Conductores) ---")
    async for user in db.users.find({"role": "conductor"}).limit(5):
        print(f"ID: {user.get('id')}, Name: {user.get('name')}")

if __name__ == "__main__":
    asyncio.run(check_db())
