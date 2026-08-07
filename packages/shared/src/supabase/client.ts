import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type { SupabaseClient };

export const createSupabaseClient = (
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: { storage?: any; detectSessionInUrl?: boolean }
): SupabaseClient => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: options?.detectSessionInUrl ?? true,
      ...(options?.storage ? { storage: options.storage } : {}),
    },
  });
};