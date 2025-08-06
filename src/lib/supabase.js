import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bezbxacfnfgbbvgtwhxh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJlemJ4YWNmbmZnYmJ2Z3R3aHhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NjI4ODgsImV4cCI6MjA3MDAzODg4OH0.gc5OBKBsjpF8J65-cqiiotL7hGIdwSdLY60vRS2VD3Y';

// Test the connection
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key length:', supabaseAnonKey.length);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('Supabase connection error:', error);
  } else {
    console.log('Supabase connection successful');
  }
});