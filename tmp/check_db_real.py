from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import certifi

MONGO_URL = "mongodb+srv://admin:admin123@cluster0.aezo66y.mongodb.net/?appName=Cluster0"

async def debug_trips():
    client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
    db = client.get_database("movilizacion")
    
    print("--- Listing all trips in the database ---")
    trips = await db.trips.find({}, {"_id": 0}).to_list(100)
    if not trips:
        print("No trips found in 'trips' collection.")
    else:
        for t in trips:
            print(f"ID: {t.get('id')}, Folio: {t.get('tracking_number')}, Status: {t.get('status')}, Driver: {t.get('driver_name')} ({t.get('driver_id')})")
    
    print("\n--- Listing users ---")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
    for u in users:
        print(f"User: {u.get('name')} (ID: {u.get('id')}, Role: {u.get('role')})")

    client.close()

if __name__ == "__main__":
    asyncio.run(debug_trips())
