// Comprehensive Application Test
// Run this in your browser console after setting up Supabase

async function runCompleteTest() {
    console.log('🧪 Starting Complete Application Test...');
    
    try {
        // Test 1: Connection Test
        console.log('\n🔌 Test 1: Connection Test');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('❌ Session error:', sessionError);
            return false;
        }
        
        console.log('✅ Supabase connection successful');
        
        // Test 2: User Authentication
        console.log('\n👤 Test 2: User Authentication');
        
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
        console.log('\n📋 Test 3: Profile Access');
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
        console.log('\n📊 Test 4: Dashboard Statistics');
        
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
        console.log('\n🚑 Test 5: Trip Operations');
        
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
        console.log('\n🚗 Test 6: Vehicle Management');
        
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
        console.log('\n👥 Test 7: User Management');
        
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
        console.log('\n📊 Test 8: Audit Logs');
        
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
        console.log('\n🧹 Test 9: Clean up');
        
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
        console.log('\n✅ Test 10: Final Validation');
        
        // Verify all operations worked
        const finalStats = {
            trips_count: (await supabase.from('trips').select('count', { count: 'exact', head: true })).count || 0,
            vehicles_count: (await supabase.from('vehicles').select('count', { count: 'exact', head: true })).count || 0,
            users_count: (await supabase.from('profiles').select('count', { count: 'exact', head: true })).count || 0,
            audit_count: (await supabase.from('audit_logs').select('count', { count: 'exact', head: true })).count || 0
        };
        
        console.log('📊 Final database stats:', finalStats);
        
        console.log('\n🎉 All tests passed! Application is working correctly with Supabase.');
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}

// Run the test
runCompleteTest().then(success => {
    if (success) {
        console.log('\n✅ Application test completed successfully!');
    } else {
        console.log('\n❌ Application test failed!');
    }
}).catch(error => {
    console.error('❌ Test execution error:', error);
});