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

    const url = new URL(req.url);
    const driverId = url.searchParams.get('driverId');
    const date = url.searchParams.get('date'); // Expected format: YYYY-MM-DD

    let query = supabaseClient
      .from('tripsheets')
      .select(`
        *,
        drivers (name)
      `); // Select all tripsheet fields and the driver's name

    if (driverId) {
      query = query.eq('driver_id', driverId);
    }

    if (date) {
      query = query.eq('trip_date', date);
    }

    // Order by trip_date descending to get most recent trips first
    query = query.order('trip_date', { ascending: false });

    const { data: trips, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching trips:', fetchError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch trips', details: fetchError.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ trips }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unexpected error in get-trips function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 