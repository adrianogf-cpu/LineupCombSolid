import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client using the service role key.
 * For server-side use only (API routes, server actions).
 * Bypasses RLS — do NOT use in client components.
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
