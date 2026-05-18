// Test script for Supabase integration
// This script tests the complete migration from MongoDB to Supabase

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Anon Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseIntegration() {
    console.log('🧪 Testing Supabase Integration...\n');

    try {
        // Test 1: Check if tables exist
        console.log('📋 Test 1: Checking database tables...');
        const { data: profiles, error: profilesError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        const { data: trips, error: tripsError } = await supabase.from('trips').select('count', { count: 'exact', head: true });
        const { data: vehicles, error: vehiclesError } = await supabase.from('vehicles').select('count', { count: 'exact', head: true });

        if (profilesError || tripsError || vehiclesError) {
            console.error('❌ Error checking tables:', profilesError, tripsError, vehiclesError);
            return false;
        }

        console.log(`✅ Tables exist: profiles(${profiles?.count || 0}), trips(${trips?.count || 0}), vehicles(${vehicles?.count || 0})\n`);

        // Test 2: User authentication flow
        console.log('🔐 Test 2: Testing user authentication...');
        
        // Try to register a new user
        const registerData = {
            email: 'test@example.com',
            password: 'testpass123',
            name: 'Test User',
            role: 'solicitante'
        };

        // Note: This would call the Supabase Function, not direct Supabase
        // For testing, we'll directly insert into profiles table
        const { data: newProfile, error: registerError } = await supabase
            .from('profiles')
            .insert([{
                ...registerData,
                status: 'pending'
            }])
            .select()
            .single();

        if (registerError) {
            console.error('❌ Error registering user:', registerError);
            return false;
        }

        console.log(`✅ User registered: ${newProfile.name} (${newProfile.email})\n`);

        // Test 3: Create a trip
        console.log('🚑 Test 3: Creating a trip...');
        
        const { data: newTrip, error: tripError } = await supabase
            .from('trips')
            .insert([{
                tracking_number: 'TR-TEST001',
                requester_id: newProfile.id,
                requester_name: newProfile.name,
                origin: 'Hospital Central',
                destination: 'Clínica Las Condes',
                patient_name: 'Test Patient',
                priority: 'normal',
                trip_type: 'clinico',
                status: 'pendiente',
                scheduled_date: new Date().toISOString().split('T')[0]
            }])
            .select()
            .single();

        if (tripError) {
            console.error('❌ Error creating trip:', tripError);
            return false;
        }

        console.log(`✅ Trip created: ${newTrip.tracking_number} - ${newTrip.origin} to ${newTrip.destination}\n`);

        // Test 4: Create a vehicle
        console.log('🚗 Test 4: Creating a vehicle...');
        
        const { data: newVehicle, error: vehicleError } = await supabase
            .from('vehicles')
            .insert([{
                plate: 'TEST-001',
                brand: 'Toyota',
                model: 'Hiace',
                type: 'Van',
                year: 2024,
                mileage: 0,
                status: 'disponible'
            }])
            .select()
            .single();

        if (vehicleError) {
            console.error('❌ Error creating vehicle:', vehicleError);
            return false;
        }

        console.log(`✅ Vehicle created: ${newVehicle.plate} - ${newVehicle.brand} ${newVehicle.model}\n`);

        // Test 5: Assign driver to trip
        console.log('👤 Test 5: Assigning driver to trip...');
        
        const { data: updatedTrip, error: assignError } = await supabase
            .from('trips')
            .update({
                driver_id: newProfile.id,
                driver_name: newProfile.name,
                vehicle_id: newVehicle.id,
                vehicle_plate: newVehicle.plate,
                status: 'asignado'
            })
            .eq('id', newTrip.id)
            .select()
            .single();

        if (assignError) {
            console.error('❌ Error assigning driver:', assignError);
            return false;
        }

        console.log(`✅ Driver assigned: ${updatedTrip.driver_name} to trip ${updatedTrip.tracking_number}\n`);

        // Test 6: Update trip status
        console.log('🔄 Test 6: Updating trip status...');
        
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
            console.error('❌ Error updating status:', statusError);
            return false;
        }

        console.log(`✅ Trip completed: ${completedTrip.tracking_number} - ${completedTrip.total_mileage}km driven\n`);

        // Test 7: Check audit logs
        console.log('📊 Test 7: Checking audit logs...');
        
        const { data: auditLogs, error: auditError } = await supabase
            .from('audit_logs')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(10);

        if (auditError) {
            console.error('❌ Error fetching audit logs:', auditError);
            return false;
        }

        console.log(`✅ Audit logs found: ${auditLogs.length} entries`);
        if (auditLogs.length > 0) {
            console.log(`📝 Latest log: ${auditLogs[0].action} by ${auditLogs[0].user_name}\n`);
        }

        // Test 8: Get dashboard stats
        console.log('📈 Test 8: Getting dashboard statistics...');
        
        // Get trip status counts
        const { data: allTrips } = await supabase.from('trips').select('status');
        const { data: allVehicles } = await supabase.from('vehicles').select('status');
        const { data: allUsers } = await supabase.from('profiles').select('status, role');

        const stats = {
            trips_by_status: allTrips?.reduce((acc, trip) => {
                acc[trip.status] = (acc[trip.status] || 0) + 1;
                return acc;
            }, {}) || {},
            
            vehicles_by_status: allVehicles?.reduce((acc, vehicle) => {
                acc[vehicle.status] = (acc[vehicle.status] || 0) + 1;
                return acc;
            }, {}) || {},
            
            users_by_role: allUsers?.reduce((acc, user) => {
                if (!acc[user.role]) acc[user.role] = { total: 0, approved: 0, pending: 0 };
                acc[user.role].total++;
                acc[user.role][user.status]++;
                return acc;
            }, {}) || {}
        };

        console.log('📊 Dashboard Stats:');
        console.log(`   Trips:`, stats.trips_by_status);
        console.log(`   Vehicles:`, stats.vehicles_by_status);
        console.log(`   Users:`, stats.users_by_role);
        console.log();

        // Test 9: Clean up test data
        console.log('🧹 Test 9: Cleaning up test data...');
        
        await supabase.from('trips').delete().eq('id', newTrip.id);
        await supabase.from('vehicles').delete().eq('id', newVehicle.id);
        await supabase.from('profiles').delete().eq('id', newProfile.id);

        console.log('✅ Test data cleaned up\n');

        console.log('🎉 All tests passed! Supabase integration is working correctly.');
        return true;

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        return false;
    }
}

// Run the test
testSupabaseIntegration()
    .then(success => {
        if (success) {
            console.log('\n✅ Supabase integration test completed successfully!');
            process.exit(0);
        } else {
            console.log('\n❌ Supabase integration test failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('❌ Test execution error:', error);
        process.exit(1);
    });