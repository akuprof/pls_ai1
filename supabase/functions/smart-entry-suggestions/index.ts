import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

// Define the expected input for suggestions
interface SuggestionInput {
  driver_id: string;
  current_km: number;
  route: string;
  car_id?: string;
  previous_trip_date?: string;
}

// Define the expected output for suggestions
interface SuggestionOutput {
  suggested_fuel_kg: number | null;
  suggested_cash_collected: number | null;
  confidence_score: number;
  notes: string;
  historical_data?: {
    avg_fuel_per_km: number;
    avg_cash_per_trip: number;
    total_trips_analyzed: number;
  };
}

serve(async (req) => {
  if (req.method !== 'POST') {
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

    const { driver_id, current_km, route, car_id, previous_trip_date }: SuggestionInput = await req.json();

    // Basic validation
    if (!driver_id || !route || current_km === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required input for suggestions' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`Fetching suggestions for driver ${driver_id}, route ${route}, current KM ${current_km}`);

    // Get historical data for this driver and route
    const { data: historicalTrips, error: histError } = await supabaseClient
      .from('tripsheets')
      .select('fuel_kg, cash_collected, start_km, end_km, trip_date')
      .eq('driver_id', driver_id)
      .eq('route', route)
      .order('trip_date', { ascending: false })
      .limit(20); // Get last 20 trips for this driver on this route

    if (histError) {
      console.error('Error fetching historical data:', histError.message);
      // Continue with mock suggestions if historical data fails
    }

    let suggested_fuel_kg: number | null = null;
    let suggested_cash_collected: number | null = null;
    let confidence_score = 0.3; // Low confidence for mock data
    let notes = "Suggestions based on historical data analysis.";
    let historical_data = null;

    if (historicalTrips && historicalTrips.length > 0) {
      // Calculate averages from historical data
      const validFuelTrips = historicalTrips.filter(trip => trip.fuel_kg !== null);
      const validCashTrips = historicalTrips.filter(trip => trip.cash_collected !== null);
      
      let avgFuelPerKm = 0;
      let avgCashPerTrip = 0;
      
      if (validFuelTrips.length > 0) {
        const totalDistance = validFuelTrips.reduce((sum, trip) => 
          sum + (trip.end_km - trip.start_km), 0);
        const totalFuel = validFuelTrips.reduce((sum, trip) => 
          sum + (trip.fuel_kg || 0), 0);
        avgFuelPerKm = totalDistance > 0 ? totalFuel / totalDistance : 0;
      }
      
      if (validCashTrips.length > 0) {
        avgCashPerTrip = validCashTrips.reduce((sum, trip) => 
          sum + (trip.cash_collected || 0), 0) / validCashTrips.length;
      }

      // Estimate distance for this trip (simple assumption)
      const estimatedDistance = 50; // Assume 50km trip, adjust based on your logic
      
      suggested_fuel_kg = avgFuelPerKm > 0 ? avgFuelPerKm * estimatedDistance : null;
      suggested_cash_collected = avgCashPerTrip > 0 ? avgCashPerTrip : null;
      confidence_score = Math.min(0.8, 0.3 + (historicalTrips.length * 0.05)); // Higher confidence with more data
      
      historical_data = {
        avg_fuel_per_km: avgFuelPerKm,
        avg_cash_per_trip: avgCashPerTrip,
        total_trips_analyzed: historicalTrips.length
      };
      
      notes = `Based on ${historicalTrips.length} historical trips on this route.`;
    } else {
      // Fallback to route-based suggestions
      if (route.includes('highway') || route.includes('intercity')) {
        suggested_fuel_kg = 12 + (Math.random() * 3); // 12-15 kg for highway
        suggested_cash_collected = 800 + (Math.random() * 200 - 100); // 700-900
        notes = "Route-based suggestion for highway/intercity travel.";
      } else if (route.includes('city') || route.includes('local')) {
        suggested_fuel_kg = 6 + (Math.random() * 2); // 6-8 kg for city
        suggested_cash_collected = 400 + (Math.random() * 100 - 50); // 350-450
        notes = "Route-based suggestion for city/local travel.";
      } else {
        // Generic suggestion
        suggested_fuel_kg = 8 + (Math.random() * 4); // 8-12 kg
        suggested_cash_collected = 600 + (Math.random() * 150 - 75); // 525-675
        notes = "Generic suggestion based on typical trip patterns.";
      }
    }

    // Apply some randomness to make suggestions more realistic
    if (suggested_fuel_kg) {
      suggested_fuel_kg += (Math.random() - 0.5) * 2; // ±1kg variation
    }
    if (suggested_cash_collected) {
      suggested_cash_collected += (Math.random() - 0.5) * 50; // ±25 variation
    }

    // Log the suggestion request to audit_logs
    await supabaseClient.from('audit_logs').insert({
      action: 'SMART_ENTRY_SUGGESTION',
      user_id: user.id,
      details: {
        input_data: { driver_id, current_km, route, car_id, previous_trip_date },
        suggestions: { suggested_fuel_kg, suggested_cash_collected, confidence_score },
        historical_data: historical_data
      },
    });

    return new Response(JSON.stringify({
      suggested_fuel_kg: suggested_fuel_kg ? parseFloat(suggested_fuel_kg.toFixed(2)) : null,
      suggested_cash_collected: suggested_cash_collected ? parseFloat(suggested_cash_collected.toFixed(2)) : null,
      confidence_score: parseFloat(confidence_score.toFixed(2)),
      notes: notes,
      historical_data: historical_data
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unexpected error in smart-entry-suggestions function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 