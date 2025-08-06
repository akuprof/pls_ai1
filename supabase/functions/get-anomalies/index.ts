import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

serve(async (req) => {
  // Ensure it's a GET request
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  }

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

    // Get query parameters for filtering
    const url = new URL(req.url);
    const isResolved = url.searchParams.get('isResolved');
    const anomalyType = url.searchParams.get('anomalyType');

    // Build the query
    let query = supabaseClient
      .from('anomalies')
      .select(`
        *,
        tripsheets (driver_id, trip_date, route, start_km, end_km, fuel_kg, cash_collected),
        drivers (name)
      `);

    // Apply filters if provided
    if (isResolved === 'true') {
      query = query.eq('is_resolved', true);
    } else if (isResolved === 'false') {
      query = query.eq('is_resolved', false);
    }

    if (anomalyType) {
      query = query.eq('anomaly_type', anomalyType);
    }

    // Order by created_at (most recent first)
    query = query.order('created_at', { ascending: false });

    const { data: anomalies, error: fetchError } = await query;

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

  } catch (error) {
    console.error('Unexpected error in get-anomalies function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 