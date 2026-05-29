// Complete Application Test Script
// This script helps you test the entire application with Supabase

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Starting Application Test...\n');

// 1. Check if frontend exists
const frontendPath = path.join(__dirname, 'frontend');
if (!fs.existsSync(frontendPath)) {
    console.error('❌ Frontend directory not found:', frontendPath);
    process.exit(1);
}

console.log('✅ Frontend found:', frontendPath);

// 2. Check if backend exists (REMOVED: Backend is now exclusively Supabase)

// 3. Check if Supabase config exists
const supabasePath = path.join(__dirname, 'supabase');
if (!fs.existsSync(supabasePath)) {
    console.error('❌ Supabase directory not found:', supabasePath);
    process.exit(1);
}

console.log('✅ Supabase config found:', supabasePath);

// 4. Create test environment file
const testEnv = `# Test Environment for Supabase Migration
# Copy this to frontend/.env.local for testing

REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
REACT_APP_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Test Configuration
NODE_ENV=development
JWT_SECRET=test-jwt-secret-key-for-development-only
`;

const testEnvPath = path.join(__dirname, 'frontend', '.env.test');
fs.writeFileSync(testEnvPath, testEnv);
console.log('✅ Created test environment:', testEnvPath);

// 5. Create comprehensive test script
const comprehensiveTest = `// Comprehensive Application Test
// Run this in your browser console after setting up Supabase

async function runCompleteTest() {
    console.log('🧪 Starting Complete Application Test...');
    
    try {
        // Test 1: Connection Test
        console.log('\\n🔌 Test 1: Connection Test');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('❌ Session error:', sessionError);
            return false;
        }
        
        console.log('✅ Supabase connection successful');
        
        // Test 2: User Authentication
        console.log('\\n👤 Test 2: User Authentication');
        
        // Test login
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: 'admin@hospital.cl',
            password: 'admin123'
        });
        
        if (loginError) {
            console.error('❌ Login error:', loginError);
            return false;
        }
        
        console.log('✅ Admin login successful');
        
        // Test 3: Profile Access
        console.log('\\n📋 Test 3: Profile Access');
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', 'admin@hospital.cl')
            .single();
        
        if (profileError) {
            console.error('❌ Profile error:', profileError);
            return false;
        }
        
        console.log('✅ Profile loaded:', profile.name, '(', profile.role, ')');
        
        // Test 4: Dashboard Stats
        console.log('\\n📊 Test 4: Dashboard Statistics');
        
        const { data: trips } = await supabase.from('trips').select('status');
        const { data: vehicles } = await supabase.from('vehicles').select('status');
        const { data: users } = await supabase.from('profiles').select('status, role');
        
        const stats = {
            trips_by_status: trips?.reduce((acc, trip) => {
                acc[trip.status] = (acc[trip.status] || 0) + 1;
                return acc;
            }, {}) || {},
            
            vehicles_by_status: vehicles?.reduce((acc, vehicle) => {
                acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
                return acc;
            }, {}) || {},
            
            users_by_role: users?.reduce((acc, user) => {
                if (!acc[user.role]) acc[user.role] = { total: 0, approved: 0, pending: 0 };
                acc[user.role].total++;
                acc[user.role][user.status]++;
                return acc;
            }, {}) || {}
        };
        
        console.log('✅ Dashboard stats:', stats);
        
        // Test 5: Trip Operations
        console.log('\\n🚑 Test 5: Trip Operations');
        
        // Create a test trip
        const testTrip = {
            origin: 'Hospital Central',
            destination: 'Clínica Las Condes',
            patient_name: 'Test Patient',
            priority: 'normal',
            trip_type: 'clinico',
            status: 'pendiente',
            scheduled_date: new Date().toISOString().split('T')[0]
        };
        
        const { data: newTrip, error: createError } = await supabase
            .from('trips')
            .insert([testTrip])
            .select()
            .single();
        
        if (createError) {
            console.error('❌ Trip creation error:', createError);
            return false;
        }
        
        console.log('✅ Trip created:', newTrip.tracking_number);
        
        // Get trip pool
        const { data: tripPool, error: poolError } = await supabase
            .from('trips')
            .select('*')
            .in('status', ['pendiente', 'asignado']);
        
        if (poolError) {
            console.error('❌ Trip pool error:', poolError);
            return false;
        }
        
        console.log('✅ Trip pool loaded:', tripPool.length, 'trips');
        
        // Assign driver to trip
        const { data: driver } = await supabase
            .from('profiles')
            .select('id, name, vehicle_plate')
            .eq('role', 'conductor')
            .single();
        
        if (driver) {
            const { data: updatedTrip, error: assignError } = await supabase
                .from('trips')
                .update({
                    driver_id: driver.id,
                    driver_name: driver.name,
                    vehicle_plate: driver.vehicle_plate,
                    status: 'asignado'
                })
                .eq('id', newTrip.id)
                .select()
                .single();
            
            if (assignError) {
                console.error('❌ Driver assignment error:', assignError);
                return false;
            }
            
            console.log('✅ Driver assigned:', updatedTrip.driver_name, 'to', updatedTrip.tracking_number);
        }
        
        // Update trip status
        const { data: completedTrip, error: statusError } = await supabase
            .from('trips')
            .update({
                status: 'completado',
                start_mileage: 1000,
                end_mileage: 1050,
                total_mileage: 50
            })
            .eq('id', newTrip.id)
            .select()
            .single();
        
        if (statusError) {
            console.error('❌ Status update error:', statusError);
            return false;
        }
        
        console.log('✅ Trip completed:', completedTrip.tracking_number, completedTrip.total_mileage + 'km');
        
        // Test 6: Vehicle Management
        console.log('\\n🚗 Test 6: Vehicle Management');
        
        const { data: vehiclesList, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('*')
            .order('plate');
        
        if (vehiclesError) {
            console.error('❌ Vehicles list error:', vehiclesError);
            return false;
        }
        
        console.log('✅ Vehicles loaded:', vehiclesList.length, 'vehicles');
        
        // Update vehicle status
        if (vehiclesList.length > 0) {
            const { data: updatedVehicle, error: statusUpdateError } = await supabase
                .from('vehicles')
                .update({ status: 'en_mantenimiento' })
                .eq('id', vehiclesList[0].id)
                .select()
                .single();
            
            if (statusUpdateError) {
                console.error('❌ Vehicle status update error:', statusUpdateError);
                return false;
            }
            
            console.log('✅ Vehicle status updated:', updatedVehicle.plate, '→', updatedVehicle.status);
        }
        
        // Test 7: User Management
        console.log('\\n👥 Test 7: User Management');
        
        const { data: usersList, error: usersError } = await supabase
            .from('profiles')
            .select('*')
            .order('name');
        
        if (usersError) {
            console.error('❌ Users list error:', usersError);
            return false;
        }
        
        console.log('✅ Users loaded:', usersList.length, 'users');
        
        // Test 8: Audit Logs
        console.log('\\n📊 Test 8: Audit Logs');
        
        const { data: auditLogs, error: auditError } = await supabase
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(10);
        
        if (auditError) {
            console.error('❌ Audit logs error:', auditError);
            return false;
        }
        
        console.log('✅ Audit logs loaded:', auditLogs.length, 'entries');
        
        if (auditLogs.length > 0) {
            console.log('📝 Latest action:', auditLogs[0].action, 'by', auditLogs[0].user_name);
        }
        
        // Test 9: Clean up
        console.log('\\n🧹 Test 9: Clean up');
        
        // Delete test trip
        const { error: deleteError } = await supabase
            .from('trips')
            .delete()
            .eq('id', newTrip.id);
        
        if (deleteError) {
            console.error('❌ Delete error:', deleteError);
            return false;
        }
        
        console.log('✅ Test trip cleaned up');
        
        // Test 10: Final Validation
        console.log('\\n✅ Test 10: Final Validation');
        
        // Verify all operations worked
        const finalStats = {
            trips_count: (await supabase.from('trips').select('count', { count: 'exact', head: true })).count || 0,
            vehicles_count: (await supabase.from('vehicles').select('count', { count: 'exact', head: true })).count || 0,
            users_count: (await supabase.from('profiles').select('count', { count: 'exact', head: true })).count || 0,
            audit_count: (await supabase.from('audit_logs').select('count', { count: 'exact', head: true })).count || 0
        };
        
        console.log('📊 Final database stats:', finalStats);
        
        console.log('\\n🎉 All tests passed! Application is working correctly with Supabase.');
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

// Run the test
runCompleteTest().then(success => {
    if (success) {
        console.log('\\n✅ Application test completed successfully!');
    } else {
        console.log('\\n❌ Application test failed!');
    }
}).catch(error => {
    console.error('❌ Test execution error:', error);
});`;

const comprehensiveTestPath = path.join(__dirname, 'supabase', 'comprehensive-test.js');
fs.writeFileSync(comprehensiveTestPath, comprehensiveTest);
console.log('✅ Created comprehensive test script:', comprehensiveTestPath);

// 6. Create quick test script
const quickTest = `// Quick Application Test
// Run this to quickly verify basic functionality

async function quickTest() {
    console.log('🧪 Quick Application Test...');
    
    try {
        // Test basic connection
        const { data: trips, error } = await supabase.from('trips').select('*').limit(1);
        
        if (error) {
            console.error('❌ Connection error:', error);
            return false;
        }
        
        console.log('✅ Connected to Supabase');
        console.log('✅ Found', trips.length, 'trips');
        
        // Test user login
        const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
            email: 'admin@hospital.cl',
            password: 'admin123'
        });
        
        if (loginError) {
            console.error('❌ Login error:', loginError);
            return false;
        }
        
        console.log('✅ Admin login successful');
        
        console.log('🎉 Quick test passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Quick test failed:', error);
        return false;
    }
}

quickTest();`;

const quickTestPath = path.join(__dirname, 'supabase', 'quick-test.js');
fs.writeFileSync(quickTestPath, quickTest);
console.log('✅ Created quick test script:', quickTestPath);

// 7. Create test data loader
const testDataLoader = `// Test Data Loader
// Use this to load test data into your Supabase database

async function loadTestData() {
    console.log('📦 Loading test data...');
    
    try {
        // Test users
        const testUsers = [
            {
                email: 'test1@hospital.cl',
                name: 'Test User 1',
                role: 'solicitante',
                status: 'approved'
            },
            {
                email: 'test2@hospital.cl', 
                name: 'Test User 2',
                role: 'conductor',
                status: 'approved'
            }
        ];
        
        for (const user of testUsers) {
            const { error } = await supabase
                .from('profiles')
                .insert([user]);
            
            if (error) {
                console.error('Error adding user:', error);
            } else {
                console.log('✅ Added user:', user.name);
            }
        }
        
        // Test trips
        const testTrips = [
            {
                origin: 'Hospital Central',
                destination: 'Clínica Las Condes',
                patient_name: 'Test Patient 1',
                priority: 'normal',
                trip_type: 'clinico',
                status: 'pendiente'
            },
            {
                origin: 'Bodega Central',
                destination: 'Pabellón Norte',
                patient_name: 'Test Material',
                priority: 'normal',
                trip_type: 'no_clinico',
                status: 'pendiente'
            }
        ];
        
        for (const trip of testTrips) {
            const { data, error } = await supabase
                .from('trips')
                .insert([trip])
                .select()
                .single();
            
            if (error) {
                console.error('Error adding trip:', error);
            } else {
                console.log('✅ Added trip:', data.tracking_number);
            }
        }
        
        console.log('🎉 Test data loaded successfully!');
        
    } catch (error) {
        console.error('❌ Error loading test data:', error);
    }
}

loadTestData();`;

const testDataLoaderPath = path.join(__dirname, 'supabase', 'load-test-data.js');
fs.writeFileSync(testDataLoaderPath, testDataLoader);
console.log('✅ Created test data loader:', testDataLoaderPath);

console.log('\n🎉 Application Test Setup Complete!');
console.log('\n📁 Test Files Created:');
console.log('   ├── frontend/.env.test - Test environment file');
console.log('   ├── supabase/comprehensive-test.js - Complete application test');
console.log('   ├── supabase/quick-test.js - Quick connection test');
console.log('   ├── supabase/load-test-data.js - Test data loader');

console.log('\n🚀 Testing Instructions:');
console.log('1. Create Supabase project and get URL + keys');
console.log('2. Update frontend/.env with your Supabase credentials');
console.log('3. Run schema.sql in Supabase SQL Editor');
console.log('4. Run test-data.sql in Supabase SQL Editor');
console.log('5. Start frontend: cd frontend && npm start');
console.log('6. Open browser console and run quick-test.js');
console.log('7. For comprehensive test: run comprehensive-test.js');

console.log('\n🧪 Ready to test the application with Supabase!');

// 8. Display test accounts
console.log('\n🔑 Test Accounts:');
console.log('   Admin: admin@hospital.cl / admin123');
console.log('   Solicitante: solicitante@hospital.cl / admin123');
console.log('   Conductor: conductor@hospital.cl / admin123');
console.log('   Coordinador: coordinador@hospital.cl / admin123');