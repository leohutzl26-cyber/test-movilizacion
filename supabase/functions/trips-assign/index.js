const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { trip_id, driver_id, vehicle_id } = JSON.parse(event.body);
    const userId = context.user?.id;
    const userRole = context.user?.role;

    // Validate input
    if (!trip_id || !driver_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'trip_id and driver_id are required' })
      };
    }

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'coordinador' && userRole !== 'conductor') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Insufficient permissions' })
      };
    }

    // Get driver info
    const { data: driver, error: driverError } = await supabase
      .from('profiles')
      .select('name, vehicle_plate')
      .eq('id', driver_id)
      .single();

    if (driverError || !driver) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Driver not found' })
      };
    }

    // Get vehicle info if provided
    let vehicleInfo = {};
    if (vehicle_id) {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('plate')
        .eq('id', vehicle_id)
        .single();

      if (vehicle) {
        vehicleInfo = {
          vehicle_id,
          vehicle_plate: vehicle.plate
        };
      }
    }

    // Update trip with driver assignment
    const updateData = {
      driver_id,
      driver_name: driver.name,
      vehicle_id: vehicle_id || null,
      vehicle_plate: vehicleInfo.vehicle_plate || driver.vehicle_plate,
      status: 'asignado'
    };

    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update(updateData)
      .eq('id', trip_id)
      .select()
      .single();

    if (updateError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: updateError.message })
      };
    }

    // Log the assignment
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_name: context.user?.name || 'Unknown',
        user_role: userRole,
        action: userRole === 'conductor' ? 'auto_asignar' : 'asignar_conductor',
        entity_type: 'trips',
        entity_id: trip_id,
        old_values: { driver_id: null, driver_name: null, vehicle_id: null, vehicle_plate: null, status: 'pendiente' },
        new_values: updatedTrip
      });

    return {
      statusCode: 200,
      body: JSON.stringify(updatedTrip)
    };
  } catch (error) {
    console.error('Trips assign error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};