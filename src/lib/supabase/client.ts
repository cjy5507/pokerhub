import { createBrowserClient } from '@supabase/ssr';
import { getBrowserSupabaseConfig, requireBrowserSupabaseConfig } from './env';

export function createClient() {
  const { url, key } = requireBrowserSupabaseConfig();
  return createBrowserClient(url, key);
}

export function createOptionalClient() {
  const config = getBrowserSupabaseConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.key);
}
