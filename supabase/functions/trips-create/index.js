const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const tripData = JSON.parse(event.body);
    const userId = context.user?.id; // From JWT middleware

    // Validate required fields
    const requiredFields = ['origin', 'destination', 'priority', 'trip_type'];
    for (const field of requiredFields) {
      if (!tripData[field]) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `${field} is required` })
        };
      }
    }

    // Get requester info
    let requesterInfo = {};
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single();

      if (profile) {
        requesterInfo = {
          requester_id: userId,
          requester_name: profile.name
        };
      }
    }

    // Create trip
    const trip = {
      tracking_number: generateTrackingNumber(),
      status: 'pending',
      scheduled_date: tripData.scheduled_date || new Date().toISOString().split('T')[0],
      ...tripData,
      ...requesterInfo
    };

    const { data: newTrip, error: tripError } = await supabase
      .from('trips')
      .insert([trip])
      .select()
      .single();

    if (tripError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: tripError.message })
      };
    }

    // Log the trip creation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_name: requesterInfo.requester_name || 'Unknown',
        user_role: context.user?.role || 'unknown',
        action: 'create_trip',
        entity_type: 'trips',
        entity_id: newTrip.id,
        new_values: newTrip
      });

    return {
      statusCode: 200,
      body: JSON.stringify(newTrip)
    };
  } catch (error) {
    console.error('Trips create error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

function generateTrackingNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `TR-${timestamp.toString().slice(-6)}${random.toString().slice(-6)}`;
}