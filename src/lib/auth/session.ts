import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

function getJWTSecret() {
  // Read at call time (not module load) so `next build` can collect page data
  // and tests can set process.env.JWT_SECRET in beforeAll hooks.
  // In production the env var must be set before the server handles any request.
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV !== 'development') {
    throw new Error(
      'JWT_SECRET environment variable is required in non-development environments. ' +
      'Set it in your environment configuration before starting the server.'
    );
  }
  return new TextEncoder().encode(secret || 'dev-secret-not-for-production');
}

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
  email: string;
  nickname: string;
  role: string;
};

// Extended payload that includes standard JWT claims set by jose
type JWTSessionPayload = SessionPayload & {
  iat?: number; // issued at (seconds since epoch)
};

/**
 * Create a JWT token
 */
export async function createToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJWTSecret());
}

/**
 * Verify and decode a JWT token, returning the raw payload including iat.
 */
async function verifyTokenRaw(token: string): Promise<JWTSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJWTSecret());
    return payload as JWTSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  return verifyTokenRaw(token);
}

/**
 * Create a session by setting the cookie
 */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await createToken(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

/**
 * Get the current session from cookies (JWT signature check only).
 * Safe to use in middleware (Edge runtime) — no DB access.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyTokenRaw(token);
}

/**
 * Get the current session and verify it has not been invalidated by a
 * password change.  This performs a DB lookup and must only be called from
 * Node.js server actions / route handlers — NOT from Edge middleware.
 *
 * Returns null when:
 *  - no session cookie exists
 *  - JWT signature is invalid / expired
 *  - the token was issued before the user's last password change
 */
export async function getSessionVerified(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const jwtPayload = await verifyTokenRaw(token);
  if (!jwtPayload) {
    return null;
  }

  // Lazy import to avoid pulling Drizzle into the Edge bundle
  const { db } = await import('@/lib/db');
  const { users } = await import('@/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  if (!db) {
    // DB unavailable — fall back to JWT-only check (fail-open, same as before)
    return jwtPayload;
  }

  const [user] = await db
    .select({ passwordChangedAt: users.passwordChangedAt })
    .from(users)
    .where(eq(users.id, jwtPayload.userId))
    .limit(1);

  if (!user) {
    return null;
  }

  // If passwordChangedAt is set, the JWT must have been issued AFTER that time
  if (user.passwordChangedAt) {
    const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);
    const issuedAt = jwtPayload.iat ?? 0;
    if (issuedAt < changedAtSeconds) {
      // Token pre-dates the password change — treat as invalid
      return null;
    }
  }

  return jwtPayload;
}

/**
 * Delete the session cookie
 */
export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
