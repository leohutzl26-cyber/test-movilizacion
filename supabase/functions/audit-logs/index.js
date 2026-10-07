const { createClient } = require('@supabase/supabase-js');
const { sinSecretos } = require('../_shared/sanitize');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

// Acciones que el navegador puede registrar (las demás las escribe el propio backend).
const ACCIONES_CLIENTE = [
  'asignar_mision_agrupada',
  'desasignar_conductor',
  'cambiar_estado_pendiente',
  'editar_traslado'
];

const LIMITE_ADMIN = 1000;
const LIMITE_COORDINADOR = 50;
const LIMITE_POR_DEFECTO = 50;

const responder = (statusCode, cuerpo) => ({ statusCode, body: JSON.stringify(cuerpo) });

exports.handler = async (event, context) => {
  try {
    const user = context.user;
    if (!user) {
      return responder(401, { error: 'No autenticado' });
    }

    const { action, ...payload } = JSON.parse(event.body || '{}');

    if (action === 'create') {
      const entry = payload.entry || {};
      const { entity_type, entity_id, old_values, new_values, details } = entry;
      const accion = entry.action;

      if (!ACCIONES_CLIENTE.includes(accion)) {
        return responder(400, { error: 'Acción de auditoría no permitida' });
      }
      if (entity_type !== 'trips' || !entity_id) {
        return responder(400, { error: 'entity_type debe ser "trips" y entity_id es obligatorio' });
      }

      // La identidad sale del JWT verificado, nunca del cuerpo de la petición.
      const { error } = await supabase.from('audit_logs').insert({
        user_id: user.id,
        user_name: user.name || null,
        user_role: user.role,
        action: accion,
        entity_type,
        entity_id: String(entity_id),
        old_values: sinSecretos(old_values) ?? null,
        new_values: sinSecretos(new_values) ?? null,
        details: typeof details === 'string' ? details.slice(0, 2000) : null
      });

      if (error) {
        return responder(400, { error: error.message });
      }
      return responder(200, { message: 'Registro de auditoría creado' });
    }

    if (action === 'list') {
      const { entity_type, entity_id } = payload;
      const esAdmin = user.role === 'admin';
      const esCoordinador = user.role === 'coordinador';

      if (!entity_id) {
        // Listados generales: el admin ve todo; el coordinador solo el feed de traslados.
        if (!esAdmin && !(esCoordinador && entity_type === 'trips')) {
          return responder(403, { error: 'Acceso denegado' });
        }
      }

      const tope = esAdmin ? LIMITE_ADMIN : LIMITE_COORDINADOR;
      const pedido = Number.parseInt(payload.limit, 10);
      const limite = Math.min(Number.isFinite(pedido) && pedido > 0 ? pedido : LIMITE_POR_DEFECTO, entity_id ? LIMITE_ADMIN : tope);

      let consulta = supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limite);

      if (entity_type) consulta = consulta.eq('entity_type', String(entity_type));
      if (entity_id) consulta = consulta.eq('entity_id', String(entity_id));

      const { data, error } = await consulta;
      if (error) {
        return responder(400, { error: error.message });
      }
      return responder(200, { logs: data || [] });
    }

    return responder(400, { error: 'Acción no válida' });
  } catch (error) {
    console.error('Audit logs function error:', error);
    return responder(500, { error: 'Internal server error' });
  }
};
