// Test Data Loader
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

loadTestData();