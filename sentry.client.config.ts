import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Performance monitoring
  tracesSampleRate: 0.1,

  // Session replay (optional, disabled by default)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
});
