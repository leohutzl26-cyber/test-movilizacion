const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { email, password, name, role } = JSON.parse(event.body);

    // Validate input
    if (!email || !password || !name || !role) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Check if role is valid
    const validRoles = ['admin', 'solicitante', 'conductor', 'coordinador'];
    if (!validRoles.includes(role)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid role' })
      };
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name,
        role
      }
    });

    if (authError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: authError.message })
      };
    }

    // Create profile in database
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        encrypted_password: await hashPassword(password),
        name,
        role,
        status: 'pending'
      })
      .select()
      .single();

    if (profileError) {
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: profileError.message })
      };
    }

    // Log the registration
    await supabase
      .from('audit_logs')
      .insert({
        user_id: authData.user.id,
        user_name: name,
        user_role: role,
        action: 'registro',
        entity_type: 'profiles',
        entity_id: authData.user.id
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        user_id: authData.user.id,
        message: 'User registered successfully. Waiting for admin approval.'
      })
    };
  } catch (error) {
    console.error('Auth register error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Helper function to hash password
async function hashPassword(password) {
  const bcrypt = require('bcrypt');
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}