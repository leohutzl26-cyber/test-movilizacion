import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

async def check():
    load_dotenv(Path('backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    user = await db.users.find_one({'email': 'coordinador@hospital.cl'})
    if user:
        print(f"STATUS: {user.get('status')}")
    else:
        print("NOT FOUND")

if __name__ == "__main__":
    asyncio.run(check())
