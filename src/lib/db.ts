/* The database (Supabase), for SERVER code only: API routes and server components.
   It uses the service-role key, which can read and write everything, so it must never reach the browser:
   do not import this file from a 'use client' component. Without the keys it returns null and callers
   answer "not connected", so the site keeps working before Supabase is set up. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return client;
}

export const dbConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
