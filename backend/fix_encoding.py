import os

file_path = r"C:\Users\Usuario\Downloads\test-movilizacion\test-movilizacion-main\frontend\src\pages\ShiftManagerDashboard.js"

try:
    # Intenta leer con diferentes codificaciones comunes
    encodings = ['utf-16', 'utf-16-le', 'utf-16-be', 'latin-1', 'cp1252', 'utf-8-sig']
    content = None
    
    for enc in encodings:
        try:
            with open(file_path, 'r', encoding=enc) as f:
                content = f.read()
                if content:
                    print(f"Successfully read with {enc}")
                    break
        except Exception:
            continue
            
    if content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("File successfully converted to UTF-8")
    else:
        print("Could not detect encoding or file is empty")
except Exception as e:
    print(f"Error: {str(e)}")
