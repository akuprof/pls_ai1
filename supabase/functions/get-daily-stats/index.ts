import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

serve(async (req) => {
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
    const targetDate = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const driverId = url.searchParams.get('driverId');
    const summaryType = url.searchParams.get('type') || 'driver_stats'; // 'driver_stats' or 'fleet_summary'

    let result;

    if (summaryType === 'fleet_summary') {
      // Get fleet-wide daily summary
      const { data, error } = await supabaseClient.rpc('get_fleet_daily_summary', {
        target_date: targetDate
      });

      if (error) {
        console.error('Error fetching fleet summary:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch fleet summary' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      result = data;
    } else {
      // Get individual driver stats
      const { data, error } = await supabaseClient.rpc('get_daily_driver_stats', {
        target_date: targetDate,
        driver_id_filter: driverId || null
      });

      if (error) {
        console.error('Error fetching driver stats:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch driver stats' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      result = data;
    }

    // Log the request to audit_logs
    await supabaseClient.from('audit_logs').insert({
      action: 'DAILY_STATS_REQUESTED',
      user_id: user.id,
      details: {
        target_date: targetDate,
        driver_id: driverId,
        summary_type: summaryType,
        record_count: Array.isArray(result) ? result.length : 1
      },
    });

    return new Response(JSON.stringify({
      date: targetDate,
      type: summaryType,
      data: result
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unexpected error in get-daily-stats function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 