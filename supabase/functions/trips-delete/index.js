const { createClient } = require('@supabase/supabase-js');
const { UUID } = require('../_shared/trip-scope');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

const responder = (statusCode, cuerpo) => ({ statusCode, body: JSON.stringify(cuerpo) });

// Elimina un traslado. Solo admin, de uno en uno y con registro en la auditoría.
exports.handler = async (event, context) => {
  try {
    const user = context.user;
    if (!user) return responder(401, { error: 'No autenticado' });
    if (user.role !== 'admin') {
      return responder(403, { error: 'Acceso denegado: Se requiere perfil de Administrador' });
    }

    const { id } = JSON.parse(event.body || '{}');
    if (typeof id !== 'string' || !UUID.test(id)) {
      return responder(400, { error: 'id de traslado no válido' });
    }

    const { data: traslado, error: findError } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
    if (findError) return responder(400, { error: findError.message });
    if (!traslado) return responder(404, { error: 'Traslado no encontrado' });

    const { error: deleteError } = await supabase.from('trips').delete().eq('id', id);
    if (deleteError) return responder(400, { error: deleteError.message });

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_name: user.name || 'Administrador',
      user_role: user.role,
      action: 'eliminar_traslado',
      entity_type: 'trips',
      entity_id: id,
      old_values: traslado
    });

    return responder(200, { message: 'Traslado eliminado exitosamente' });
  } catch (error) {
    console.error('Trips delete function error:', error);
    return responder(500, { error: 'Internal server error' });
  }
};
