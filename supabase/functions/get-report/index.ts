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
    const reportDate = url.searchParams.get('date');
    const reportType = url.searchParams.get('type') || 'csv';

    let query = supabaseClient
      .from('tripsheets')
      .select(`
        id, trip_date, start_km, end_km, fuel_kg, cash_collected, route, notes,
        drivers (name)
      `);

    if (reportDate) {
      query = query.eq('trip_date', reportDate);
    }

    query = query.order('trip_date', { ascending: true });

    const { data: trips, error: fetchError } = await query;

    if (fetchError) {
      return new Response(JSON.stringify({ error: 'Failed to generate report' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!trips || trips.length === 0) {
      return new Response(JSON.stringify({ message: 'No trip data found.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Log audit
    await supabaseClient.from('audit_logs').insert({
      action: 'REPORT_GENERATED',
      entity_id: null,
      user_id: user.id,
      details: {
        report_type: reportDate ? `Daily Report (${reportDate})` : 'All Trips Report',
        record_count: trips.length,
      },
    });

    if (reportType === 'json') {
      return new Response(JSON.stringify({ 
        report: {
          type: reportDate ? `Daily Report (${reportDate})` : 'All Trips Report',
          generated_at: new Date().toISOString(),
          record_count: trips.length,
          data: trips
        }
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } else if (reportType === 'summary') {
      const totalDistance = trips.reduce((sum, trip) => sum + (trip.end_km - trip.start_km), 0);
      const totalFuel = trips.reduce((sum, trip) => sum + (trip.fuel_kg || 0), 0);
      const totalCash = trips.reduce((sum, trip) => sum + (trip.cash_collected || 0), 0);
      
      const summary = {
        report_type: reportDate ? `Daily Summary (${reportDate})` : 'All Trips Summary',
        generated_at: new Date().toISOString(),
        record_count: trips.length,
        total_distance_km: totalDistance,
        total_fuel_kg: totalFuel,
        total_cash_collected: totalCash,
        average_distance_per_trip: trips.length > 0 ? totalDistance / trips.length : 0,
        average_fuel_per_trip: trips.length > 0 ? totalFuel / trips.length : 0,
        average_cash_per_trip: trips.length > 0 ? totalCash / trips.length : 0,
      };

      return new Response(JSON.stringify({ summary }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } else {
      // Generate CSV report
      let csvContent = "Trip ID,Date,Driver Name,Start KM,End KM,Distance (KM),Fuel (KG),Cash Collected,Route,Notes\n";

      trips.forEach(trip => {
        const driverName = trip.drivers ? trip.drivers.name : 'N/A';
        const distance = trip.end_km - trip.start_km;
        const fuel = trip.fuel_kg || 'N/A';
        const cash = trip.cash_collected || 'N/A';
        const route = trip.route || '';
        const notes = trip.notes || '';
        
        csvContent += `${trip.id},${trip.trip_date},"${driverName}",${trip.start_km},${trip.end_km},${distance},${fuel},${cash},"${route}","${notes}"\n`;
      });

      const filename = reportDate ? `fleet_report_${reportDate}.csv` : `fleet_report_all_trips.csv`;
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
        status: 200,
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 