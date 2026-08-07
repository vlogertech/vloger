import { createSupabaseClient } from '@vloger/shared/supabase';
import { createDbService } from '@vloger/shared/services';
import * as SecureStore from 'expo-secure-store';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const CHUNK_SIZE = 1800;

const ChunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const meta = await SecureStore.getItemAsync(`${key}__chunks`);
    if (!meta) return SecureStore.getItemAsync(key);
    const count = parseInt(meta, 10);
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}__${i}`))
    );
    return parts.every(Boolean) ? parts.join('') : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.deleteItemAsync(`${key}__chunks`);
      return SecureStore.setItemAsync(key, value);
    }
    const chunks = Math.ceil(value.length / CHUNK_SIZE);
    await SecureStore.setItemAsync(`${key}__chunks`, String(chunks));
    await Promise.all(
      Array.from({ length: chunks }, (_, i) =>
        SecureStore.setItemAsync(`${key}__${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE))
      )
    );
  },
  async removeItem(key: string): Promise<void> {
    const meta = await SecureStore.getItemAsync(`${key}__chunks`);
    if (meta) {
      const count = parseInt(meta, 10);
      await Promise.all([
        SecureStore.deleteItemAsync(`${key}__chunks`),
        ...Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}__${i}`)),
      ]);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  storage: ChunkedSecureStore,
  detectSessionInUrl: false,
});

// Service DB/storage/realtime mutualisé avec l'app web (packages/shared).
export const db = createDbService(supabase);