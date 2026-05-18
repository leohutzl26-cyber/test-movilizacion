// Browser Test Runner
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
        console.log('\n👤 Test 1: Authentication');
        const { data: { session }, error } = await supabase.auth.signInWithPassword({
            email: 'admin@hospital.cl',
            password: 'admin123'
        });
        
        if (error) throw error;
        console.log('✅ Authentication successful');
        
        // Test 2: Dashboard Stats
        console.log('\n📊 Test 2: Dashboard Stats');
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
        console.log('\n🚑 Test 3: Create Trip');
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
        console.log('\n🔄 Test 4: Update Trip');
        const { data: updatedTrip, error: updateError } = await supabase
            .from('trips')
            .update({ status: 'completado' })
            .eq('id', trip.id)
            .select()
            .single();
        
        if (updateError) throw updateError;
        console.log('✅ Trip updated:', updatedTrip.status);
        
        // Test 5: Clean up
        console.log('\n🧹 Test 5: Clean up');
        const { error: deleteError } = await supabase
            .from('trips')
            .delete()
            .eq('id', trip.id);
        
        if (deleteError) throw deleteError;
        console.log('✅ Trip deleted');
        
        console.log('\n🎉 Comprehensive test passed!');
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
