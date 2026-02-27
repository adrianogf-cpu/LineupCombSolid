'use strict';

const { createClient } = require('@supabase/supabase-js');

/**
 * Create Supabase client using service role key (bypasses RLS).
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 * Throws descriptive error if env vars are missing.
 */
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

module.exports = { getSupabaseClient };
