import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def check_licenses():
    ROOT_DIR = Path(__file__).parent.parent
    load_dotenv(ROOT_DIR / 'backend' / '.env')
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    
    if not mongo_url or not db_name:
        print("Error: No se encontró MONGO_URL o DB_NAME en .env")
        return

    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print(f"Conectando a DB: {db_name}")
    
    # Buscar todos los conductores
    drivers = await db.users.find({"role": "conductor"}).to_list(100)
    
    print("\nReporte de Licencias por Conductor:")
    print("-" * 50)
    for d in drivers:
        name = d.get('name', 'N/A')
        email = d.get('email', 'N/A')
        expiry = d.get('license_expiry')
        status = d.get('status', 'N/A')
        
        print(f"Nombre: {name:20} | Licencia: {str(expiry):10} | Estado: {status}")
    
    print("-" * 50)
    print(f"Total conductores encontrados: {len(drivers)}")

if __name__ == "__main__":
    asyncio.run(check_licenses())
