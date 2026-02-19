type SupabaseConfig = {
  url: string;
  key: string;
};

const warningCache = new Set<string>();

function getEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function warnOnce(message: string): void {
  if (process.env.NODE_ENV === 'test' || warningCache.has(message)) {
    return;
  }
  warningCache.add(message);
  console.warn(message);
}

export function getSupabaseUrl(): string | null {
  return getEnv('NEXT_PUBLIC_SUPABASE_URL') ?? getEnv('SUPABASE_URL');
}

export function getSupabasePublishableKey(): string | null {
  return getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
}

export function getSupabaseServiceRoleKey(): string | null {
  return getEnv('SUPABASE_SERVICE_ROLE_KEY') ?? getEnv('SUPABASE_SECRET_KEY');
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
