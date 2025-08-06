import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

// Define the expected structure of the incoming chat query
interface ChatQueryData {
  query: string;
  chatHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
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

    const { query, chatHistory }: ChatQueryData = await req.json();

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return new Response(JSON.stringify({ error: 'Missing or invalid query' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Initialize OpenAI client
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY environment variable not set.');
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log(`Received chat query from user ${user.id}: "${query}"`);

    // --- Retrieval Augmented Generation (RAG) Logic ---
    let contextData = '';
    let fetchedTrips = [];

    // Simple keyword-based retrieval for demonstration
    if (query.toLowerCase().includes('trip') || query.toLowerCase().includes('driver') || query.toLowerCase().includes('fuel') || query.toLowerCase().includes('cash')) {
      // Attempt to extract driver name or date from query
      const driverMatch = query.match(/(?:driver|of)\s+([a-zA-Z\s]+?)(?:\s+on|\s+for|\s+|$)/i);
      const dateMatch = query.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2}(?:st|nd|rd|th)?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}\b/i);

      let driverName = driverMatch ? driverMatch[1].trim() : null;
      let tripDate = dateMatch ? dateMatch[0].trim() : null;

      // Try to convert common date formats to YYYY-MM-DD
      if (tripDate && !/^\d{4}-\d{2}-\d{2}$/.test(tripDate)) {
        try {
          const dateObj = new Date(tripDate);
          if (!isNaN(dateObj.getTime())) {
            tripDate = dateObj.toISOString().split('T')[0];
          } else {
            tripDate = null;
          }
        } catch (e) {
          tripDate = null;
        }
      }

      console.log(`Attempting RAG: Driver Name: ${driverName}, Trip Date: ${tripDate}`);

      let tripsQuery = supabaseClient.from('tripsheets').select('*, drivers (name)');

      if (driverName) {
        const { data: drivers, error: driverError } = await supabaseClient.from('drivers').select('id').ilike('name', `%${driverName}%`);
        if (driverError) console.error('Error finding driver:', driverError.message);
        if (drivers && drivers.length > 0) {
          tripsQuery = tripsQuery.eq('driver_id', drivers[0].id);
        } else {
          console.log(`Driver "${driverName}" not found.`);
        }
      }

      if (tripDate) {
        tripsQuery = tripsQuery.eq('trip_date', tripDate);
      }

      tripsQuery = tripsQuery.order('trip_date', { ascending: false }).limit(5);

      const { data: trips, error: tripsError } = await tripsQuery;

      if (tripsError) {
        console.error('Error fetching trips for RAG:', tripsError.message);
      } else if (trips && trips.length > 0) {
        fetchedTrips = trips;
        contextData = "Relevant trip data:\n";
        trips.forEach(trip => {
          const driver = trip.drivers ? trip.drivers.name : 'Unknown Driver';
          contextData += `- Trip ID: ${trip.id.substring(0, 8)}, Driver: ${driver}, Date: ${trip.trip_date}, Route: ${trip.route}, KM: ${trip.end_km - trip.start_km}, Fuel: ${trip.fuel_kg || 'N/A'}kg, Cash: $${trip.cash_collected || 'N/A'}\n`;
        });
        console.log('RAG Context:', contextData);
      } else {
        contextData = "No specific trip data found for the query criteria.\n";
      }
    } else if (query.toLowerCase().includes('anomaly') || query.toLowerCase().includes('issue') || query.toLowerCase().includes('problem')) {
      // Fetch recent anomalies for context
      const { data: anomalies, error: anomaliesError } = await supabaseClient
        .from('anomalies')
        .select('anomaly_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (anomaliesError) {
        console.error('Error fetching anomalies for RAG:', anomaliesError.message);
      } else if (anomalies && anomalies.length > 0) {
        contextData = "Recent anomalies:\n";
        anomalies.forEach(anomaly => {
          contextData += `- Type: ${anomaly.anomaly_type}, Description: ${anomaly.description}, Flagged: ${new Date(anomaly.created_at).toLocaleDateString()}\n`;
        });
        console.log('RAG Context (Anomalies):', contextData);
      } else {
        contextData = "No recent anomalies found.\n";
      }
    }

    // --- Construct Messages for OpenAI ---
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: 'system',
        content: `You are a helpful fleet management assistant. Answer questions about fleet data based on the provided context. If the context is not sufficient, state that you don't have enough information.
        
        Today's date is ${new Date().toISOString().split('T')[0]}.
        
        You can help with:
        - Trip information and statistics
        - Driver performance analysis
        - Fuel consumption and cash collection data
        - Anomaly detection and issues
        - General fleet management questions
        
        Always be helpful, accurate, and professional in your responses.`
      },
    ];

    if (contextData) {
      messages.push({ role: 'system', content: `Context from database:\n${contextData}` });
    }

    // Add chat history
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach(msg => {
        messages.push({ role: msg.role === 'bot' ? 'assistant' : 'user', content: msg.text });
      });
    }

    // Add the current user query
    messages.push({ role: 'user', content: query });

    // --- Call OpenAI API ---
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json();
      console.error('OpenAI API error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to get AI response' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const openaiData = await openaiResponse.json();
    const botResponseText = openaiData.choices[0].message?.content || "I'm sorry, I couldn't generate a response.";

    // Log the chat interaction to audit_logs
    await supabaseClient.from('audit_logs').insert({
      action: 'CHAT_QUERY_AI',
      user_id: user.id,
      details: {
        user_query: query,
        ai_context: contextData,
        ai_response: botResponseText,
        model_used: 'gpt-3.5-turbo',
        tokens_used: openaiData.usage?.total_tokens || 0,
      },
    });

    return new Response(JSON.stringify({
      text: botResponseText,
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unexpected error in chat-query function:', error.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 