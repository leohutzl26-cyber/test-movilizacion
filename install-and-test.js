// Complete Install and Test Script
// This script will help you set up and test the application with Supabase

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Complete Install and Test Process...\n');

// 1. Check project structure
console.log('📁 Checking project structure...');

const requiredDirs = ['frontend', 'supabase'];
const requiredFiles = [
    'frontend/package.json',
    'supabase/schema.sql',
    'supabase/test-data.sql',
    'frontend/src/lib/supabase.js'
];

requiredDirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (fs.existsSync(dirPath)) {
        console.log(`✅ ${dir}/ directory found`);
    } else {
        console.error(`❌ ${dir}/ directory not found`);
        process.exit(1);
    }
});

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file} found`);
    } else {
        console.error(`❌ ${file} not found`);
        process.exit(1);
    }
});

// 2. Create environment setup
console.log('\n🔧 Setting up environment...');

// Create .env file for frontend
const frontendEnv = `# Supabase Configuration
# Replace with your actual Supabase project values

REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Email Configuration (optional)
RESEND_API_KEY=your-resend-api-key
SENDER_EMAIL=your-sender-email@example.com

# WebAuthn Configuration
RP_ID=your-domain.com
RP_NAME=Movilización HCU
ORIGIN=https://your-frontend-url.com

# Development Settings
NODE_ENV=development
`;

const envPath = path.join(__dirname, 'frontend', '.env.local');
fs.writeFileSync(envPath, frontendEnv);
console.log('✅ Created .env.local for frontend');

// 3. Install dependencies
console.log('\n📦 Installing dependencies...');

try {
    // Install frontend dependencies
    console.log('Installing frontend dependencies...');
    execSync('cd frontend && npm install', { stdio: 'inherit' });
    console.log('✅ Frontend dependencies installed');
} catch (error) {
    console.error('❌ Error installing frontend dependencies:', error.message);
}

// 4. Create quick start script
console.log('\n🚀 Creating quick start script...');

const quickStartScript = `#!/bin/bash

echo "🚀 Quick Start - Movilización HCU with Supabase"
echo "================================================"

# Check if we have environment variables
if [ ! -f "frontend/.env.local" ]; then
    echo "❌ .env.local not found. Please create it with your Supabase credentials."
    exit 1
fi

echo "✅ Environment file found"

# Check if node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    cd frontend && npm install && cd ..
fi

echo "🎯 Starting the application..."
echo "1. Open your browser and go to: http://localhost:3000"
echo "2. Use these test credentials:"
echo "   Admin: admin@hospital.cl / admin123"
echo "   Solicitante: solicitante@hospital.cl / admin123"
echo "   Conductor: conductor@hospital.cl / admin123"
echo "   Coordinador: coordinador@hospital.cl / admin123"
echo ""
echo "🧪 Test the application:"
echo "1. Open browser developer tools (F12)"
echo "2. Go to Console tab"
echo "3. Copy and paste this script:"
echo ""
echo "   fetch('/supabase/quick-test.js').then(r => r.text()).then(eval);"
echo ""

# Start the application
cd frontend && npm start
`;

const quickStartPath = path.join(__dirname, 'quick-start.sh');
fs.writeFileSync(quickStartPath, quickStartScript);
fs.chmodSync(quickStartPath, '755'); // Make executable
console.log('✅ Created quick-start.sh script');

// 5. Create Windows batch script
const windowsScript = `@echo off
echo 🚀 Quick Start - Movilización HCU with Supabase
echo ================================================

if not exist "frontend\.env.local" (
    echo ❌ .env.local not found. Please create it with your Supabase credentials.
    pause
    exit /b 1
)

echo ✅ Environment file found

if not exist "frontend\node_modules" (
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
`;

const windowsPath = path.join(__dirname, 'quick-start.bat');
fs.writeFileSync(windowsPath, windowsScript);
console.log('✅ Created quick-start.bat script');

// 6. Create test runner for browser
const browserTestRunner = `// Browser Test Runner
// Copy and paste this into your browser console to test the application

console.log('🧪 Starting Browser Test Runner...');

// Test configuration
const testConfig = {
    supabaseUrl: 'https://your-project-ref.supabase.co',
    supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

// Initialize Supabase
const { createClient } = window.supabase;
const supabase = createClient(testConfig.supabaseUrl, testConfig.supabaseKey);

async function runQuickTest() {
    console.log('🔌 Testing connection...');
    
    try {
        // Test basic connection
        const { data, error } = await supabase.from('profiles').select('*').limit(1);
        
        if (error) {
            console.error('❌ Connection failed:', error);
            return false;
        }
        
        console.log('✅ Connected to Supabase');
        
        // Test authentication
        console.log('👤 Testing authentication...');
        const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
            email: 'admin@hospital.cl',
            password: 'admin123'
        });
        
        if (authError) {
            console.error('❌ Authentication failed:', authError);
            return false;
        }
        
        console.log('✅ Admin login successful');
        
        // Test data access
        console.log('📊 Testing data access...');
        
        const { data: trips } = await supabase.from('trips').select('*').limit(5);
        const { data: vehicles } = await supabase.from('vehicles').select('*').limit(5);
        const { data: users } = await supabase.from('profiles').select('*').limit(5);
        
        console.log('✅ Data loaded:', {
            trips: trips?.length || 0,
            vehicles: vehicles?.length || 0,
            users: users?.length || 0
        });
        
        console.log('🎉 Quick test passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Quick test failed:', error);
        return false;
    }
}

async function runComprehensiveTest() {
    console.log('🧪 Starting Comprehensive Test...');
    
    try {
        // Test 1: Authentication
        console.log('\\n👤 Test 1: Authentication');
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
            email: 'admin@hospital.cl',
            password: 'admin123'
        });
        
        if (error) throw error;
        console.log('✅ Authentication successful');
        
        // Test 2: Dashboard Stats
        console.log('\\n📊 Test 2: Dashboard Stats');
        const { data: trips } = await supabase.from('trips').select('status');
        const { data: vehicles } = await supabase.from('vehicles').select('status');
        
        const stats = {
            trips_by_status: trips?.reduce((acc, t) => {
                acc[t.status] = (acc[t.status] || 0) + 1;
                return acc;
            }, {}) || {},
            vehicles_by_status: vehicles?.reduce((acc, v) => {
                acc[v.status] = (acc[v.status] || 0) + 1;
                return acc;
            }, {}) || {}
        };
        
        console.log('✅ Stats:', stats);
        
        // Test 3: Create Trip
        console.log('\\n🚑 Test 3: Create Trip');
        const newTrip = {
            origin: 'Test Origin',
            destination: 'Test Destination',
            patient_name: 'Test Patient',
            priority: 'normal',
            trip_type: 'clinico',
            status: 'pendiente'
        };
        
        const { data: trip, error: createError } = await supabase
            .from('trips')
            .insert([newTrip])
            .select()
            .single();
        
        if (createError) throw createError;
        console.log('✅ Trip created:', trip.tracking_number);
        
        // Test 4: Update Trip
        console.log('\\n🔄 Test 4: Update Trip');
        const { data: updatedTrip, error: updateError } = await supabase
            .from('trips')
            .update({ status: 'completado' })
            .eq('id', trip.id)
            .select()
            .single();
        
        if (updateError) throw updateError;
        console.log('✅ Trip updated:', updatedTrip.status);
        
        // Test 5: Clean up
        console.log('\\n🧹 Test 5: Clean up');
        const { error: deleteError } = await supabase
            .from('trips')
            .delete()
            .eq('id', trip.id);
        
        if (deleteError) throw deleteError;
        console.log('✅ Trip deleted');
        
        console.log('\\n🎉 Comprehensive test passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Comprehensive test failed:', error);
        return false;
    }
}

// Run the test
const testType = prompt('Which test would you like to run? (quick/comprehensive)', 'quick');
if (testType === 'quick') {
    runQuickTest();
} else if (testType === 'comprehensive') {
    runComprehensiveTest();
} else {
    console.log('Invalid test type. Use "quick" or "comprehensive".');
}
`;

const browserTestPath = path.join(__dirname, 'supabase', 'browser-test-runner.js');
fs.writeFileSync(browserTestPath, browserTestRunner);
console.log('✅ Created browser test runner');

// 7. Create status checker
const statusChecker = `// Application Status Checker
// Run this to check the current status of your application

console.log('🔍 Application Status Checker...');

// Check environment
const envChecks = {
    '.env.local': fs.existsSync('frontend/.env.local'),
    'node_modules': fs.existsSync('frontend/node_modules'),
    'package.json': fs.existsSync('frontend/package.json'),
    'schema.sql': fs.existsSync('supabase/schema.sql'),
    'test-data.sql': fs.existsSync('supabase/test-data.sql')
};

console.log('\\n📁 File Status:');
Object.entries(envChecks).forEach(([file, exists]) => {
    console.log(\`   \${exists ? '✅' : '❌'} \${file}\`);
});

// Check if we can run the application
const canRun = envChecks['.env.local'] && envChecks['node_modules'];
console.log(\`\\n🚀 Can run application: \${canRun ? 'YES' : 'NO'}\`);

// Check required environment variables
if (envChecks['.env.local']) {
    const envContent = fs.readFileSync('frontend/.env.local', 'utf8');
    const hasUrl = envContent.includes('REACT_APP_SUPABASE_URL=');
    const hasKey = envContent.includes('REACT_APP_SUPABASE_ANON_KEY=');
    
    console.log('\\n🔑 Environment Status:');
    console.log(\`   Supabase URL: \${hasUrl ? '✅' : '❌'}\`);
    console.log(\`   Supabase Key: \${hasKey ? '✅' : '❌'}\`);
}

console.log('\\n📋 Next Steps:');
if (!canRun) {
    console.log('1. Create .env.local with your Supabase credentials');
    console.log('2. Run: cd frontend && npm install');
} else {
    console.log('1. Run: cd frontend && npm start');
    console.log('2. Open http://localhost:3000');
    console.log('3. Test with admin@hospital.cl / admin123');
}
`;

const statusCheckerPath = path.join(__dirname, 'check-status.js');
fs.writeFileSync(statusCheckerPath, statusChecker);
console.log('✅ Created status checker');

console.log('\n🎉 Install and Test Setup Complete!');
console.log('\n📁 Files Created:');
console.log('   ├── frontend/.env.local - Environment configuration');
console.log('   ├── quick-start.sh - Quick start script (Mac/Linux)');
console.log('   ├── quick-start.bat - Quick start script (Windows)');
console.log('   ├── supabase/browser-test-runner.js - Browser test runner');
console.log('   ├── check-status.js - Application status checker');

console.log('\n🚀 Quick Start Instructions:');
console.log('1. Create Supabase project at https://supabase.com');
console.log('2. Copy your project URL and anon key');
console.log('3. Edit frontend/.env.local with your credentials');
console.log('4. Run quick-start.bat (Windows) or ./quick-start.sh (Mac/Linux)');
console.log('5. Open http://localhost:3000 in your browser');

console.log('\n🧪 Testing Instructions:');
console.log('1. Open browser developer tools (F12)');
console.log('2. Go to Console tab');
console.log('3. Copy and paste browser-test-runner.js code');
console.log('4. Run the test');

console.log('\n📊 Test Accounts:');
console.log('   Admin: admin@hospital.cl / admin123');
console.log('   Solicitante: solicitante@hospital.cl / admin123');
console.log('   Conductor: conductor@hospital.cl / admin123');
console.log('   Coordinador: coordinador@hospital.cl / admin123');

console.log('\n🔍 Status Check:');
console.log('   Run: node check-status.js');
console.log('   This will check if everything is properly configured');

// Run status check
console.log('\n📊 Running status check...');
try {
    execSync('node check-status.js', { stdio: 'inherit' });
} catch (error) {
    console.log('Status check completed.');
}

console.log('\n✨ Ready to test your application with Supabase!');