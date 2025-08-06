import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define the structure of the trip data from the request body
interface TripEntryData {
  driver_id: string;
  car_id: string;
  trip_date: string;
  start_km: number;
  end_km: number;
  fuel_kg?: number;
  cash_collected?: number;
  route: string;
  notes?: string;
}

serve(async (req: Request) => {
  // We'll only handle POST requests for creating tripsheets.
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    // Create a Supabase client with the user's authorization.
    // This requires the SUPABASE_URL and SUPABASE_ANON_KEY environment variables to be set.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the authenticated user's ID from the request context
    // This assumes you're passing the Authorization header from the client
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error or no user:', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized', details: userError?.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { driver_id, car_id, trip_date, start_km, end_km, fuel_kg, cash_collected, route, notes }: TripEntryData = await req.json();

    // Basic validation
    if (!driver_id || !car_id || !trip_date || start_km === undefined || end_km === undefined || !route) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (start_km < 0 || end_km < 0 || end_km < start_km) {
      return new Response(JSON.stringify({ error: 'Invalid KM values' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (fuel_kg !== undefined && fuel_kg < 0) {
      return new Response(JSON.stringify({ error: 'Fuel (kg) cannot be negative' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (cash_collected !== undefined && cash_collected < 0) {
      return new Response(JSON.stringify({ error: 'Cash collected cannot be negative' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Insert data into the 'tripsheets' table
    const { data: newTrip, error: insertError } = await supabaseClient
      .from('tripsheets')
      .insert({
        driver_id,
        car_id,
        trip_date,
        start_km,
        end_km,
        fuel_kg,
        cash_collected,
        route,
        notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting trip sheet:', insertError.message);
      return new Response(JSON.stringify({ error: 'Failed to save trip sheet', details: insertError.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Log the action to 'audit_logs'
    const { error: auditLogError } = await supabaseClient
      .from('audit_logs')
      .insert({
        action: 'TRIPSHEET_INSERT',
        entity_id: newTrip.id, // ID of the newly created tripsheet
        user_id: user.id, // The user who performed the action
        details: {
          driver_id: newTrip.driver_id,
          trip_date: newTrip.trip_date,
          route: newTrip.route,
        },
      });

    if (auditLogError) {
      console.error('Error logging audit:', auditLogError.message);
      // Don't fail the main request if audit logging fails, but log it
    }

    return new Response(JSON.stringify({ message: 'Trip sheet saved successfully', trip: newTrip }), {
      headers: { 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    });

  } catch (error) {
    console.error('An unexpected error occurred:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});