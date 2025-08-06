import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
      },
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (req.method) {
      case 'GET':
        if (action === 'profile') {
          // Get current user's profile with roles
          const { data: profile, error: profileError } = await supabaseClient
            .rpc('get_current_user_profile');

          if (profileError) {
            return new Response(JSON.stringify({ error: 'Failed to get profile' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500,
            });
          }

          return new Response(JSON.stringify({ profile: profile[0] }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          });
        } else if (action === 'users') {
          // Get all users (admin only)
          const { data: users, error: usersError } = await supabaseClient
            .rpc('get_users_with_roles');

          if (usersError) {
            return new Response(JSON.stringify({ error: 'Failed to get users' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500,
            });
          }

          return new Response(JSON.stringify({ users }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          return new Response(JSON.stringify({ error: 'Invalid action' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

      case 'POST':
        const body = await req.json();
        
        if (action === 'assign-role') {
          // Assign role to user (admin only)
          const { target_user_id, role } = body;
          
          if (!target_user_id || !role) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            });
          }

          const { data: result, error: assignError } = await supabaseClient
            .rpc('assign_user_role', { target_user_id, new_role: role });

          if (assignError) {
            return new Response(JSON.stringify({ error: assignError.message }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500,
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          });
        } else if (action === 'remove-role') {
          // Remove role from user (admin only)
          const { target_user_id, role } = body;
          
          if (!target_user_id || !role) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 400,
            });
          }

          const { data: result, error: removeError } = await supabaseClient
            .rpc('remove_user_role', { target_user_id, role_to_remove: role });

          if (removeError) {
            return new Response(JSON.stringify({ error: removeError.message }), {
              headers: { 'Content-Type': 'application/json' },
              status: 500,
            });
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          return new Response(JSON.stringify({ error: 'Invalid action' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          });
        }

      default:
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 405,
        });
    }

  } catch (error) {
    console.error('Unexpected error in auth function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 