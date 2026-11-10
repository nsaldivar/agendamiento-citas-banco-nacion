import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/domain/types/database.types';

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY requeridas');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

