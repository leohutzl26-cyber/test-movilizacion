from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
import certifi

MONGO_URL = "mongodb+srv://admin:admin123@cluster0.aezo66y.mongodb.net/?appName=Cluster0"

async def debug_trips():
    client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
    db = client.get_database("movilizacion")
    
    print("--- Detailed Trip Info ---")
    trips = await db.trips.find({}, {"_id": 0}).to_list(100)
    for t in trips:
        print(f"ID: {t.get('id')}")
        print(f"  Folio: {t.get('tracking_number')}")
        print(f"  Status: {t.get('status')}")
        print(f"  Driver: {t.get('driver_name')} (ID: {t.get('driver_id')})")
        print(f"  Completed At: {t.get('completed_at')}")
        print(f"  Returned At: {t.get('returned_at')}")
        print(f"  Previous Driver: {t.get('previous_driver_id')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_trips())
