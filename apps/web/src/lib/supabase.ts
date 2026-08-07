import { createSupabaseClient } from '@vloger/shared/supabase';
import { createDbService } from '@vloger/shared/services';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as string;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);

// Service DB/storage/realtime mutualisé avec l'app mobile (packages/shared).
export const db = createDbService(supabase);