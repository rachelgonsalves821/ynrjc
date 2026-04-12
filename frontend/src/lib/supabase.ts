import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

/**
 * Browser Supabase client (anon key). Use for direct client-side features
 * (realtime, storage) when needed; most LangUp data flows through the Express API.
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey) : null;

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY"
    );
  }
  return supabase;
}
