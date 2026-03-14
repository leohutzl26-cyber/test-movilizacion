import asyncio
import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Cargar variables de entorno
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')

async def clear_trips():
    if not MONGO_URL or not DB_NAME:
        print("Error: MONGO_URL o DB_NAME no configurados en el archivo .env")
        return

    print(f"Conectando a MongoDB en {MONGO_URL}...")
    client = AsyncIOMotorClient(MONGO_URL, tlsCAFile=certifi.where())
    db = client[DB_NAME]

    confirm = input("¿Estás seguro de que deseas eliminar TODOS los viajes de la colección 'trips'? (s/n): ")
    if confirm.lower() != 's':
        print("Operación cancelada.")
        return

    result = await db.trips.delete_many({})
    print(f"Eliminación completada. Se eliminaron {result.deleted_count} viajes.")

if __name__ == "__main__":
    asyncio.run(clear_trips())
