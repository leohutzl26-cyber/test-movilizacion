// Frontend Test Script
// Run this in your browser console after setting up Supabase

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...');
  
  try {
    // Test 1: Check if we can access profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error accessing profiles:', error);
      return false;
    }
    
    console.log('✅ Profiles loaded:', profiles.length);
    
    // Test 2: Check trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .limit(5);
    
    if (triesError) {
      console.error('❌ Error accessing trips:', tripsError);
      return false;
    }
    
    console.log('✅ Trips loaded:', trips.length);
    
    // Test 3: Check vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .limit(5);
    
    if (vehiclesError) {
      console.error('❌ Error accessing vehicles:', vehiclesError);
      return false;
    }
    
    console.log('✅ Vehicles loaded:', vehicles.length);
    
    // Test 4: Try to create a new trip
    const newTrip = {
      origin: 'Test Origin',
      destination: 'Test Destination',
      patient_name: 'Test Patient',
      priority: 'normal',
      trip_type: 'no_clinico',
      status: 'pendiente',
      scheduled_date: new Date().toISOString().split('T')[0]
    };
    
    const { data: createdTrip, error: createError } = await supabase
      .from('trips')
      .insert([newTrip])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating trip:', createError);
      return false;
    }
    
    console.log('✅ Trip created:', createdTrip.tracking_number);
    
    // Clean up
    await supabase
      .from('trips')
      .delete()
      .eq('id', createdTrip.id);
    
    console.log('✅ Test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testSupabaseConnection();
