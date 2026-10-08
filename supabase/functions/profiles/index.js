const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

// Todas las columnas de profiles salvo encrypted_password.
const COLUMNAS_PERFIL = 'id, email, name, role, status, shift_type, license_expiry, created_at, username, must_change_password, is_active, rut, vehicle_plate, phone, department, is_working, current_vehicle_id';

// Lo mínimo que necesitan las pantallas para listar personal. Sin RUT, email, usuario ni licencia.
const COLUMNAS_DIRECTORIO = 'id, name, role, department, vehicle_plate, current_vehicle_id, is_working, is_active';

const ROLES_DIRECTORIO = ['conductor', 'personal_clinico'];
const ROLES_CON_TELEFONO = ['admin', 'coordinador', 'gestion_camas'];
const MAX_IDS = 100;
const MAX_FILAS = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const responder = (statusCode, cuerpo) => ({ statusCode, body: JSON.stringify(cuerpo) });

exports.handler = async (event, context) => {
  try {
    const user = context.user;
    if (!user) {
      return responder(401, { error: 'No autenticado' });
    }

    const { action, ...payload } = JSON.parse(event.body || '{}');

    // Perfil propio + ids de las personas de su mismo departamento (para filtrar traslados).
    if (action === 'me') {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(COLUMNAS_PERFIL)
        .eq('id', user.id)
        .maybeSingle();

      if (error) return responder(400, { error: error.message });
      if (!profile) return responder(404, { error: 'Perfil no encontrado' });

      let departmentUserIds = [];
      if (profile.department) {
        const { data: colegas, error: deptError } = await supabase
          .from('profiles')
          .select('id')
          .eq('department', profile.department);
        if (deptError) return responder(400, { error: deptError.message });
        departmentUserIds = (colegas || []).map((c) => c.id);
      }

      return responder(200, { profile, department_user_ids: departmentUserIds });
    }

    // Listado mínimo de conductores o personal clínico, por rol o por ids.
    if (action === 'directory') {
      const { role, ids } = payload;
      const tieneRol = typeof role === 'string' && ROLES_DIRECTORIO.includes(role);
      const tieneIds = Array.isArray(ids) && ids.length > 0;

      if (role !== undefined && !tieneRol) {
        return responder(400, { error: `role debe ser uno de: ${ROLES_DIRECTORIO.join(', ')}` });
      }
      if (!tieneRol && !tieneIds) {
        return responder(400, { error: 'Indica un rol o una lista de ids' });
      }
      if (tieneIds && (ids.length > MAX_IDS || !ids.every((i) => typeof i === 'string' && UUID.test(i)))) {
        return responder(400, { error: `ids debe ser una lista de hasta ${MAX_IDS} UUID` });
      }

      const columnas = ROLES_CON_TELEFONO.includes(user.role)
        ? `${COLUMNAS_DIRECTORIO}, phone`
        : COLUMNAS_DIRECTORIO;

      // Por ids solo se consulta personal operativo, nunca administradores ni solicitantes.
      let consulta = supabase
        .from('profiles')
        .select(columnas)
        .in('role', tieneRol ? [role] : ROLES_DIRECTORIO)
        .order('name', { ascending: true })
        .limit(MAX_FILAS);
      if (tieneIds) consulta = consulta.in('id', ids);

      const { data, error } = await consulta;
      if (error) return responder(400, { error: error.message });
      return responder(200, { users: data || [] });
    }

    // Listado completo para la administración de usuarios.
    if (action === 'list') {
      if (user.role !== 'admin') {
        return responder(403, { error: 'Acceso denegado: Se requiere perfil de Administrador' });
      }

      const ordenarPor = ['name', 'created_at'].includes(payload.order_by) ? payload.order_by : 'created_at';
      let consulta = supabase
        .from('profiles')
        .select(COLUMNAS_PERFIL)
        .order(ordenarPor, { ascending: payload.ascending === true })
        .limit(MAX_FILAS);
      if (typeof payload.role === 'string') consulta = consulta.eq('role', payload.role);

      const { data, error } = await consulta;
      if (error) return responder(400, { error: error.message });
      return responder(200, { users: data || [] });
    }

    return responder(400, { error: 'Acción no válida' });
  } catch (error) {
    console.error('Profiles function error:', error);
    return responder(500, { error: 'Internal server error' });
  }
};
