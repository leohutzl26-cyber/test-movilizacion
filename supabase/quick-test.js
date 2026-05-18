// Quick Application Test
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

quickTest();