const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    // Get counts for different trip statuses
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('status');

    // Get vehicle status counts
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('status');

    // Get user status counts
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('status, role');

    // Calculate metrics
    const byStatus = {
      pendiente: trips?.filter(t => t.status === 'pendiente').length || 0,
      asignado: trips?.filter(t => t.status === 'asignado').length || 0,
      en_curso: trips?.filter(t => t.status === 'en_curso').length || 0,
      completado: trips?.filter(t => t.status === 'completado').length || 0,
      cancelado: trips?.filter(t => t.status === 'cancelado').length || 0
    };

    const byVehicleStatus = {
      disponible: vehicles?.filter(v => v.status === 'disponible').length || 0,
      en_curso: vehicles?.filter(v => v.status === 'en_curso').length || 0,
      en_mantenimiento: vehicles?.filter(v => v.status === 'en_mantenimiento').length || 0,
      en_limpieza: vehicles?.filter(v => v.status === 'en_limpieza').length || 0,
      no_disponible: vehicles?.filter(v => v.status === 'no_disponible').length || 0
    };

    const byUserRole = {};
    users?.forEach(user => {
      if (!byUserRole[user.role]) {
        byUserRole[user.role] = { total: 0, approved: 0, pending: 0, rejected: 0 };
      }
      byUserRole[user.role].total++;
      byUserRole[user.role][user.status]++;
    });

    // Get recent activity (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .gte('timestamp', twentyFourHoursAgo)
      .order('timestamp', { ascending: false })
      .limit(10);

    // Calculate daily statistics
    const today = new Date().toISOString().split('T')[0];
    const { data: todayTrips } = await supabase
      .from('trips')
      .select('*')
      .eq('scheduled_date', today);

    const { data: todayCompletedTrips } = await supabase
      .from('trips')
      .select('*')
      .eq('scheduled_date', today)
      .eq('status', 'completado');

    const totalMileageToday = todayCompletedTrips?.reduce((sum, trip) => sum + (trip.total_mileage || 0), 0) || 0;

    const stats = {
      by_status: byStatus,
      by_vehicle_status: byVehicleStatus,
      by_user_role: byUserRole,
      recent_activity: recentLogs || [],
      daily_stats: {
        total_trips: todayTrips?.length || 0,
        completed_trips: todayCompletedTrips?.length || 0,
        total_mileage: totalMileageToday,
        average_mileage: todayCompletedTrips?.length > 0 ? totalMileageToday / todayCompletedTrips.length : 0
      },
      summary: {
        total_trips: Object.values(byStatus).reduce((sum, count) => sum + count, 0),
        total_vehicles: Object.values(byVehicleStatus).reduce((sum, count) => sum + count, 0),
        total_users: Object.values(byUserRole).reduce((sum, role) => sum + role.total, 0),
        pending_approvals: Object.values(byUserRole).reduce((sum, role) => sum + role.pending, 0)
      }
    };

    return {
      statusCode: 200,
      body: JSON.stringify(stats)
    };
  } catch (error) {
    console.error('Stats dashboard error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};