const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { trip_id, status, mileage, cancel_reason } = JSON.parse(event.body);
    const userId = context.user?.id;
    const userRole = context.user?.role;

    // Validate input
    if (!trip_id || !status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'trip_id and status are required' })
      };
    }

    // Get current trip data
    const { data: currentTrip, error: tripError } = await supabase
      .from('trips')
      .select('*')
      .eq('id', trip_id)
      .single();

    if (tripError || !currentTrip) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Trip not found' })
      };
    }

    // Check permissions based on status change
    const statusTransitions = {
      'pendiente': ['asignado', 'cancelado'],
      'asignado': ['en_curso', 'cancelado', 'pendiente'],
      'en_curso': ['completado', 'cancelado'],
      'completado': [],
      'cancelado': []
    };

    if (!statusTransitions[currentTrip.status].includes(status)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Cannot change status from ${currentTrip.status} to ${status}` })
      };
    }

    // Prepare update data
    const updateData = {
      status,
      cancel_reason: status === 'cancelado' ? cancel_reason : null
    };

    // Handle mileage tracking
    if (mileage !== undefined) {
      if (status === 'en_curso') {
        updateData.start_mileage = mileage;
      } else if (status === 'completado') {
        updateData.end_mileage = mileage;
        if (currentTrip.start_mileage) {
          updateData.total_mileage = mileage - currentTrip.start_mileage;
        }
      }
    }

    // Update trip
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

    // Log the status change
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_name: context.user?.name || 'Unknown',
        user_role: userRole,
        action: `cambiar_estado_${status}`,
        entity_type: 'trips',
        entity_id: trip_id,
        old_values: currentTrip,
        new_values: updatedTrip
      });

    return {
      statusCode: 200,
      body: JSON.stringify(updatedTrip)
    };
  } catch (error) {
    console.error('Trips update status error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};