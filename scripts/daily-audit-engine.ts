// scripts/daily-audit-engine.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';
import { format, subDays, parseISO } from 'https://esm.sh/date-fns@2.30.0';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use service role key for backend scripts

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables.');
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
});

console.log('Daily Audit Engine started...');

async function runDailyAudit() {
  try {
    // Fetch all drivers
    const { data: drivers, error: driversError } = await supabase.from('drivers').select('id, name');
    if (driversError) throw driversError;

    // Fetch all tripsheets for the last 3 days to check for "No entry for > 2 days" and other recent anomalies
    const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');
    const { data: tripsheets, error: tripsheetsError } = await supabase
      .from('tripsheets')
      .select('id, driver_id, trip_date, start_km, end_km, fuel_kg, cash_collected, route')
      .gte('trip_date', threeDaysAgo); // Get trips from the last 3 days

    if (tripsheetsError) throw tripsheetsError;

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const dayBeforeYesterday = format(subDays(new Date(), 2), 'yyyy-MM-dd');

    const anomaliesToInsert: Array<any> = [];
    const auditLogsToInsert: Array<any> = [];

    // --- Anomaly Detection Logic ---

    // 1. Detect: Missing entries (for yesterday)
    // 2. Detect: No entry for > 2 days
    for (const driver of drivers) {
      const driverTrips = tripsheets.filter(t => t.driver_id === driver.id);

      // Check for missing entry yesterday
      const hasEntryYesterday = driverTrips.some(t => format(parseISO(t.trip_date), 'yyyy-MM-dd') === yesterday);
      if (!hasEntryYesterday) {
        anomaliesToInsert.push({
          tripsheet_id: null, // Not tied to a specific tripsheet
          anomaly_type: 'Missing Entry',
          description: `Driver ${driver.name} had no trip entry for yesterday (${yesterday}).`,
        });
        console.log(`Anomaly: Missing entry for ${driver.name} on ${yesterday}`);
      }

      // Check for no entry for > 2 days (i.e., no entry for today, yesterday, and day before yesterday)
      const hasEntryToday = driverTrips.some(t => format(parseISO(t.trip_date), 'yyyy-MM-dd') === today);
      const hasEntryDayBeforeYesterday = driverTrips.some(t => format(parseISO(t.trip_date), 'yyyy-MM-dd') === dayBeforeYesterday);

      if (!hasEntryToday && !hasEntryYesterday && !hasEntryDayBeforeYesterday) {
        anomaliesToInsert.push({
          tripsheet_id: null, // Not tied to a specific tripsheet
          anomaly_type: 'No Entry > 2 Days',
          description: `Driver ${driver.name} has had no trip entries for the last 3 days (${dayBeforeYesterday} to ${today}).`,
        });
        console.log(`Anomaly: No entry for > 2 days for ${driver.name}`);
      }
    }

    // 3. Detect: Fuel > 15kg in single shift (for trips in the last 3 days)
    for (const trip of tripsheets) {
      if (trip.fuel_kg !== null && trip.fuel_kg > 15) {
        const driverName = drivers.find(d => d.id === trip.driver_id)?.name || 'Unknown Driver';
        anomaliesToInsert.push({
          tripsheet_id: trip.id,
          anomaly_type: 'Fuel > 15kg',
          description: `Driver ${driverName}, Trip on ${trip.trip_date}, Fuel: ${trip.fuel_kg} KG. Exceeds 15kg limit.`,
        });
        console.log(`Anomaly: Fuel > 15kg for trip ${trip.id}`);
      }

      // 4. Detect: Cash mismatch (Placeholder - requires more complex logic)
      // This would typically involve looking up expected cash for a given route/distance
      // For demonstration, we'll just add a simple example if cash is very low for a long trip
      const distance = trip.end_km - trip.start_km;
      if (distance > 100 && trip.cash_collected !== null && trip.cash_collected < 100) {
        const driverName = drivers.find(d => d.id === trip.driver_id)?.name || 'Unknown Driver';
        anomaliesToInsert.push({
          tripsheet_id: trip.id,
          anomaly_type: 'Potential Cash Mismatch',
          description: `Driver ${driverName}, Trip on ${trip.trip_date}, Route: ${trip.route}. Distance: ${distance} KM, Cash Collected: $${trip.cash_collected}. Potentially low cash for distance.`,
        });
        console.log(`Anomaly: Potential Cash Mismatch for trip ${trip.id}`);
      }
    }

    // --- Insert Anomalies into DB ---
    if (anomaliesToInsert.length > 0) {
      const { error: insertAnomaliesError } = await supabase.from('anomalies').insert(anomaliesToInsert);
      if (insertAnomaliesError) throw insertAnomaliesError;
      console.log(`Successfully inserted ${anomaliesToInsert.length} anomalies.`);
    } else {
      console.log('No new anomalies detected today.');
    }

    // --- Log Audit Action ---
    auditLogsToInsert.push({
      action: 'DAILY_AUDIT_RUN',
      entity_id: null, // Not tied to a specific entity
      user_id: null, // Run by system, not a specific user
      details: {
        run_date: today,
        anomalies_detected: anomaliesToInsert.length,
      },
    });

    const { error: insertAuditLogError } = await supabase.from('audit_logs').insert(auditLogsToInsert);
    if (insertAuditLogError) {
      console.error('Error logging daily audit:', insertAuditLogError.message);
    } else {
      console.log('Daily audit run logged successfully.');
    }

  } catch (error) {
    console.error('Error during daily audit:', error.message);
    // Log this critical error to audit_logs as well if possible, or an external logging service
    await supabase.from('audit_logs').insert({
      action: 'DAILY_AUDIT_ERROR',
      entity_id: null,
      user_id: null,
      details: {
        error_message: error.message,
        stack: error.stack,
        run_date: format(new Date(), 'yyyy-MM-dd'),
      },
    });
  }
  console.log('Daily Audit Engine finished.');
}

// Run the audit function
runDailyAudit(); 