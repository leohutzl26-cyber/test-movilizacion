@echo off
echo 🚀 Quick Start - Movilización HCU with Supabase
echo ================================================

if not exist "frontend.env.local" (
    echo ❌ .env.local not found. Please create it with your Supabase credentials.
    pause
    exit /b 1
)

echo ✅ Environment file found

if not exist "frontend
ode_modules" (
    echo 📦 Installing dependencies...
    cd frontend
    npm install
    cd ..
)

echo 🎯 Starting the application...
echo 1. Open your browser and go to: http://localhost:3000
echo 2. Use these test credentials:
echo    Admin: admin@hospital.cl / admin123
echo    Solicitante: solicitante@hospital.cl / admin123
echo    Conductor: conductor@hospital.cl / admin123
echo    Coordinador: coordinador@hospital.cl / admin123
echo.
echo 🧪 Test the application:
echo 1. Open browser developer tools (F12)
echo 2. Go to Console tab
echo 3. Copy and paste this script:
echo.
echo    fetch('/supabase/quick-test.js').then(r => r.text()).then(eval);
echo.

cd frontend
npm start
