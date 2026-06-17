const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { currentPassword, newPassword } = JSON.parse(event.body);
    const userId = context.user?.id;

    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Acceso no autorizado: Se requiere inicio de sesión' })
      };
    }

    if (!currentPassword || !newPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'La contraseña actual y la nueva contraseña son obligatorias' })
      };
    }

    if (newPassword.length < 6) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'La nueva contraseña debe tener al menos 6 caracteres' })
      };
    }

    // Get user profile
    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (findError || !profile) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Usuario no encontrado' })
      };
    }

    // Check if user is active
    if (profile.is_active === false) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'El usuario se encuentra inactivo' })
      };
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, profile.encrypted_password);
    if (!passwordMatch) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'La contraseña actual es incorrecta' })
      };
    }

    // Hash new password
    const saltRounds = 12;
    const encryptedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user profile
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        encrypted_password: encryptedPassword,
        must_change_password: false
      })
      .eq('id', userId)
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
        user_name: profile.name,
        user_role: profile.role,
        action: 'cambio_clave_usuario',
        entity_type: 'profiles',
        entity_id: userId,
        details: 'El usuario cambió su contraseña'
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Contraseña cambiada exitosamente',
        user: {
          id: updatedProfile.id,
          username: updatedProfile.username,
          name: updatedProfile.name,
          role: updatedProfile.role,
          must_change_password: updatedProfile.must_change_password
        }
      })
    };

  } catch (error) {
    console.error('Auth change password error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
  }
};
