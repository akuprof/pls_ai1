// scripts/test-audit-engine.ts
// Test script to verify the daily audit engine setup

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.44.0';

console.log('Testing Daily Audit Engine Setup...');

// Check environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

console.log('Environment Variables:');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  Deno.exit(1);
}

// Test database connection
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
  },
});

async function testConnection() {
  try {
    console.log('\nTesting database connection...');
    
    // Test drivers table
    const { data: drivers, error: driversError } = await supabase.from('drivers').select('id, name').limit(1);
    if (driversError) {
      console.error('❌ Error accessing drivers table:', driversError.message);
      return false;
    }
    console.log('✅ Drivers table accessible');

    // Test tripsheets table
    const { data: tripsheets, error: tripsheetsError } = await supabase.from('tripsheets').select('id').limit(1);
    if (tripsheetsError) {
      console.error('❌ Error accessing tripsheets table:', tripsheetsError.message);
      return false;
    }
    console.log('✅ Tripsheets table accessible');

    // Test anomalies table
    const { data: anomalies, error: anomaliesError } = await supabase.from('anomalies').select('id').limit(1);
    if (anomaliesError) {
      console.error('❌ Error accessing anomalies table:', anomaliesError.message);
      return false;
    }
    console.log('✅ Anomalies table accessible');

    // Test audit_logs table
    const { data: auditLogs, error: auditLogsError } = await supabase.from('audit_logs').select('id').limit(1);
    if (auditLogsError) {
      console.error('❌ Error accessing audit_logs table:', auditLogsError.message);
      return false;
    }
    console.log('✅ Audit_logs table accessible');

    console.log('\n✅ All database connections successful!');
    console.log('✅ Daily audit engine is ready to run.');
    
    return true;
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Setup verification complete! You can now run the daily audit engine.');
  } else {
    console.log('\n❌ Setup verification failed. Please check your configuration.');
    Deno.exit(1);
  }
}); 