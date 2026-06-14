const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { action, table, id, data } = JSON.parse(event.body);
    const user = context.user;

    // 1. Validar autenticación y rol
    if (!user || !['admin', 'gestion_camas', 'coordinador'].includes(user.role)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'No autorizado. Se requieren permisos de administrador, gestor de camas o coordinador.' })
      };
    }

    // 2. Validar tabla permitida
    const allowedTables = ['origins', 'destinations', 'origin_services', 'clinical_staff', 'vehicles'];
    if (!allowedTables.includes(table)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Tabla '${table}' no permitida para operaciones de catálogo.` })
      };
    }

    // 3. Validar acción permitida
    if (!['create', 'update', 'delete'].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Acción '${action}' no válida.` })
      };
    }

    let result = null;
    let queryError = null;

    if (action === 'create') {
      if (!data) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Datos no suministrados para la creación.' })
        };
      }
      const { data: record, error } = await supabase
        .from(table)
        .insert([data])
        .select()
        .single();
      
      result = record;
      queryError = error;
    } else if (action === 'update') {
      if (!id || !data) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'ID o datos no suministrados para la actualización.' })
        };
      }
      const { data: record, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      result = record;
      queryError = error;
    } else if (action === 'delete') {
      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'ID no suministrado para la eliminación.' })
        };
      }
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      queryError = error;
      result = { success: true, id };
    }

    if (queryError) {
      console.error(`Error de base de datos en ${table} (${action}):`, queryError);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: queryError.message })
      };
    }

    // 4. Loguear en la tabla audit_logs
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: user.id,
          user_name: user.name || user.email || 'Admin/Gestor',
          user_role: user.role,
          action: `${action}_catalog_${table}`,
          entity_type: table,
          entity_id: action === 'delete' ? id : (result?.id || id),
          new_values: action === 'delete' ? null : result
        });
    } catch (logErr) {
      console.error('Error al insertar registro en audit_logs:', logErr);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Error en manage-catalogs handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
