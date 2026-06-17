const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { username, email, password } = JSON.parse(event.body);
    const loginIdentifier = username || email;

    // Validate input
    if (!loginIdentifier || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El nombre de usuario/correo y la contraseña son obligatorios' })
      };
    }

    // Get user profile by username or email for backward compatibility and resilience
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.eq."${loginIdentifier}",email.eq."${loginIdentifier}"`)
      .maybeSingle();

    if (profileError || !profile) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Nombre de usuario o contraseña incorrectos' })
      };
    }

    // Check if user is active
    if (profile.is_active === false) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'El usuario se encuentra inactivo' })
      };
    }

    // Check if user is approved
    if (profile.status !== 'approved') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Usuario no aprobado por el administrador' })
      };
    }

    // Verify password (in production, use Supabase Auth instead)
    const bcrypt = require('bcryptjs');
    const passwordMatch = await bcrypt.compare(password, profile.encrypted_password);

    if (!passwordMatch) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Nombre de usuario o contraseña incorrectos' })
      };
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        userId: profile.id,
        email: profile.email,
        username: profile.username,
        name: profile.name,
        role: profile.role,
        must_change_password: profile.must_change_password
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    // Log the login
    await supabase
      .from('audit_logs')
      .insert({
        user_id: profile.id,
        user_name: profile.name,
        user_role: profile.role,
        action: 'login',
        entity_type: 'profiles',
        entity_id: profile.id
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        token,
        user: {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          name: profile.name,
          role: profile.role,
          status: profile.status,
          must_change_password: profile.must_change_password
        }
      })
    };
  } catch (error) {
    console.error('Auth login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno del servidor' })
    };
  }
};