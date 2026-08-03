const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

// Roles that are allowed to request a trip. Drivers and the read-only
// "panel" display board never create trips from the frontend.
const ALLOWED_ROLES = ['admin', 'solicitante', 'coordinador', 'gestion_camas', 'personal_clinico'];

// Only these fields can be set by the client. Anything else (status,
// tracking_number, requester_id/name, driver/vehicle assignment, mileage,
// timestamps) is server-controlled to prevent mass assignment.
const ALLOWED_TRIP_FIELDS = [
  'origin', 'origin_address', 'origin_maps_url',
  'destination', 'destination_address', 'destination_maps_url',
  'patient_name', 'patient_unit',
  'priority', 'notes', 'trip_type',
  'clinical_team', 'contact_person', 'scheduled_date', 'rut', 'age',
  'diagnosis', 'weight', 'bed', 'transfer_reason', 'attending_physician',
  'appointment_time', 'departure_time',
  'required_personnel', 'patient_requirements', 'accompaniment',
  'task_details', 'staff_count', 'accompaniment_staff_id', 'assigned_clinical_staff'
];

exports.handler = async (event, context) => {
  try {
    const tripData = JSON.parse(event.body);
    const userId = context.user?.id; // From JWT middleware
    const userRole = context.user?.role;

    if (!userId || !ALLOWED_ROLES.includes(userRole)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'No tienes permisos para crear traslados' })
      };
    }

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

    const sanitizedTripData = {};
    for (const field of ALLOWED_TRIP_FIELDS) {
      if (tripData[field] !== undefined) {
        sanitizedTripData[field] = tripData[field];
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
      status: tripData.trip_type === 'clinico' ? 'revision_gestor' : 'pendiente',
      scheduled_date: tripData.scheduled_date || new Date().toISOString().split('T')[0],
      ...sanitizedTripData,
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