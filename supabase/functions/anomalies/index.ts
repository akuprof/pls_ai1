import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      },
    );

    // Get the authenticated user's ID from the request context
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error or no user:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const url = new URL(req.url);
    const isResolved = url.searchParams.get('isResolved');
    const anomalyType = url.searchParams.get('anomalyType');

    if (req.method === 'GET') {
      // Get anomalies
      const { data: anomalies, error: fetchError } = await supabaseClient
        .rpc('get_anomalies', {
          p_is_resolved: isResolved === 'true' ? true : isResolved === 'false' ? false : null,
          p_anomaly_type: anomalyType || null
        });

      if (fetchError) {
        console.error('Error fetching anomalies:', fetchError.message);
        return new Response(JSON.stringify({ error: 'Failed to fetch anomalies', details: fetchError.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ anomalies }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });

    } else if (req.method === 'POST') {
      // Resolve an anomaly
      const { anomalyId } = await req.json();

      if (!anomalyId) {
        return new Response(JSON.stringify({ error: 'Anomaly ID is required' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        });
      }

      const { data: resolved, error: resolveError } = await supabaseClient
        .rpc('resolve_anomaly', {
          p_anomaly_id: anomalyId,
          p_resolved_by: user.id
        });

      if (resolveError) {
        console.error('Error resolving anomaly:', resolveError.message);
        return new Response(JSON.stringify({ error: 'Failed to resolve anomaly', details: resolveError.message }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      return new Response(JSON.stringify({ 
        message: 'Anomaly resolved successfully', 
        resolved: resolved 
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });

    } else {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 405,
      });
    }

  } catch (error) {
    console.error('Unexpected error in anomalies function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 