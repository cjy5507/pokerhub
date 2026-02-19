import { createClient } from '@supabase/supabase-js';
import { getAdminSupabaseConfig, requireAdminSupabaseConfig } from './env';

export function createAdminClient() {
  const { url, key } = requireAdminSupabaseConfig();
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createOptionalAdminClient() {
  const config = getAdminSupabaseConfig();
  if (!config) return null;

  return createClient(config.url, config.key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
