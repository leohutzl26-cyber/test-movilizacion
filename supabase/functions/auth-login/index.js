const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { email, password } = JSON.parse(event.body);

    // Validate input
    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    // Check if user is approved
    if (profile.status !== 'approved') {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'User not approved by admin' })
      };
    }

    // Verify password (in production, use Supabase Auth instead)
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, profile.encrypted_password);

    if (!passwordMatch) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid email or password' })
      };
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        userId: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role
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
          name: profile.name,
          role: profile.role,
          status: profile.status
        }
      })
    };
  } catch (error) {
    console.error('Auth login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};