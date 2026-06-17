const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { action, ...payload } = JSON.parse(event.body);
    const userId = context.user?.id;
    const userRole = context.user?.role;

    // Check admin permissions
    if (userRole !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Acceso denegado: Se requiere perfil de Administrador' })
      };
    }

    if (!action) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Se requiere especificar un parámetro de acción' })
      };
    }

    // Hash helper for password '123456'
    const hashDefaultPassword = async () => {
      const saltRounds = 12;
      return await bcrypt.hash('123456', saltRounds);
    };

    if (action === 'create') {
      const { name, rut, username, role } = payload;

      if (!name || !username || !role) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Nombre completo, nombre de usuario y rol son obligatorios' })
        };
      }

      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (checkError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: checkError.message })
        };
      }

      if (existingUser) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'El nombre de usuario ya está registrado en el sistema' })
        };
      }

      // Hash default password
      const encryptedPassword = await hashDefaultPassword();

      // Insert new profile
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          name,
          rut: rut || null,
          username,
          role,
          status: 'approved',
          encrypted_password: encryptedPassword,
          must_change_password: true,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: createError.message })
        };
      }

      // Log action in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          user_name: context.user?.name || 'Administrador',
          user_role: userRole,
          action: 'crear_usuario',
          entity_type: 'profiles',
          entity_id: newProfile.id,
          new_values: newProfile
        });

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Usuario creado exitosamente',
          user: newProfile
        })
      };
    }

    if (action === 'update') {
      const { id, name, rut, username, role, is_active } = payload;

      if (!id || !name || !username || !role) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'ID, Nombre, Nombre de usuario y Rol son obligatorios para actualizar' })
        };
      }

      // Get current values for logging
      const { data: currentUser, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (findError || !currentUser) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Usuario no encontrado' })
        };
      }

      // Check if username already exists for another user
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', id)
        .maybeSingle();

      if (existingUser) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'El nombre de usuario ya está registrado por otra persona' })
        };
      }

      // Update user profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          name,
          rut: rut || null,
          username,
          role,
          is_active: is_active !== undefined ? is_active : true
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: updateError.message })
        };
      }

      // Log action in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          user_name: context.user?.name || 'Administrador',
          user_role: userRole,
          action: 'editar_usuario',
          entity_type: 'profiles',
          entity_id: id,
          old_values: currentUser,
          new_values: updatedProfile
        });

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Usuario actualizado exitosamente',
          user: updatedProfile
        })
      };
    }

    if (action === 'reset_password') {
      const { id } = payload;

      if (!id) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'ID de usuario es obligatorio para restablecer clave' })
        };
      }

      // Get user profile
      const { data: profile, error: findError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (findError || !profile) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'Usuario no encontrado' })
        };
      }

      // Hash default password
      const encryptedPassword = await hashDefaultPassword();

      // Update profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          encrypted_password: encryptedPassword,
          must_change_password: true
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: updateError.message })
        };
      }

      // Log action in audit logs
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          user_name: context.user?.name || 'Administrador',
          user_role: userRole,
          action: 'restablecer_clave_usuario',
          entity_type: 'profiles',
          entity_id: id,
          details: `Clave restablecida por defecto (123456)`
        });

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'Contraseña restablecida exitosamente a 123456',
          user: updatedProfile
        })
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Acción no válida' })
    };

  } catch (error) {
    console.error('Admin users function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
