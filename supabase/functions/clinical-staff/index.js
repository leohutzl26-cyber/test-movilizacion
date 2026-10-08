const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

// Catálogo de personal clínico para listas desplegables. Sin RUT: ninguna pantalla lo usa y era
// legible con la anon key. Las altas, ediciones y bajas siguen yendo por manage-catalogs.
const COLUMNAS = 'id, name, role, is_active, created_at';
const MAX_FILAS = 500;

const responder = (statusCode, cuerpo) => ({ statusCode, body: JSON.stringify(cuerpo) });

exports.handler = async (event, context) => {
  try {
    if (!context.user) {
      return responder(401, { error: 'No autenticado' });
    }

    const { action } = JSON.parse(event.body || '{}');

    if (action === 'list') {
      const { data, error } = await supabase
        .from('clinical_staff')
        .select(COLUMNAS)
        .order('name', { ascending: true })
        .limit(MAX_FILAS);

      if (error) return responder(400, { error: error.message });
      return responder(200, { staff: data || [] });
    }

    return responder(400, { error: 'Acción no válida' });
  } catch (error) {
    console.error('Clinical staff function error:', error);
    return responder(500, { error: 'Internal server error' });
  }
};
