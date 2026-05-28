const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  try {
    const { user_id, action } = JSON.parse(event.body);
    const userId = context.user?.id;
    const userRole = context.user?.role;

    // Check admin permissions
    if (userRole !== 'admin') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }

    // Validate input
    if (!user_id || !action || !['approve', 'reject'].includes(action)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'user_id and valid action (approve/reject) are required' })
      };
    }

    // Get current user data
    const { data: currentUser, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (userError || !currentUser) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    // Update user status
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected'
    };

    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user_id)
      .select()
      .single();

    if (updateError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: updateError.message })
      };
    }

    // Log the approval/rejection
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        user_name: context.user?.name || 'Unknown',
        user_role: userRole,
        action: action === 'approve' ? 'aprobar_usuario' : 'rechazar_usuario',
        entity_type: 'profiles',
        entity_id: user_id,
        old_values: currentUser,
        new_values: updatedUser
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `User ${action}d successfully`,
        user: updatedUser
      })
    };
  } catch (error) {
    console.error('Users approve error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};