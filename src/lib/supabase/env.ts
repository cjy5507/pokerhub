type SupabaseConfig = {
  url: string;
  key: string;
};

const warningCache = new Set<string>();

function warnOnce(message: string): void {
  if (process.env.NODE_ENV === 'test' || warningCache.has(message)) {
    return;
  }
  warningCache.add(message);
  console.warn(message);
}

// Next.js inlines NEXT_PUBLIC_* vars at build time ONLY when accessed as
// static literals (process.env.NEXT_PUBLIC_FOO). Dynamic access like
// process.env[name] is NOT inlined, causing them to be undefined on the client.

export function getSupabaseUrl(): string | null {
  const value = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').trim();
  return value || null;
}

export function getSupabasePublishableKey(): string | null {
  const value = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
  return value || null;
}

export function getSupabaseServiceRoleKey(): string | null {
  const value = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? '').trim();
  return value || null;
}

export function getBrowserSupabaseConfig(): SupabaseConfig | null {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();

  if (!url || !key) {
    warnOnce(
      '[supabase] Missing public credentials. Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Realtime will fall back to polling.'
    );
    return null;
  }

  return { url, key };
}

export function getAdminSupabaseConfig(): SupabaseConfig | null {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!url || !key) {
    warnOnce(
      '[supabase] Missing admin credentials. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) for server broadcasts/uploads.'
    );
    return null;
  }

  return { url, key };
}

export function requireBrowserSupabaseConfig(): SupabaseConfig {
  const config = getBrowserSupabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase public credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).'
    );
  }
  return config;
}

export function requireAdminSupabaseConfig(): SupabaseConfig {
  const config = getAdminSupabaseConfig();
  if (!config) {
    throw new Error(
      'Supabase admin credentials are missing. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).'
    );
  }
  return config;
}
