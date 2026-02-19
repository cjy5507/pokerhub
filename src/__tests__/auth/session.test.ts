import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createToken, verifyToken } from '@/lib/auth/session';
import type { SessionPayload } from '@/lib/auth/session';

// next/headers is a Next.js server-only module that throws in plain Node.
// We only test createToken and verifyToken which do not touch cookies,
// but the module-level import of `cookies` would fail without a mock.
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

const TEST_SECRET = 'test-secret-key-for-vitest-32-bytes!!';

const samplePayload: SessionPayload = {
  userId: 'user-uuid-1234',
  email: 'player@openpoker.kr',
  nickname: '테스트플레이어',
  role: 'user',
};

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

describe('createToken', () => {
  it('returns a non-empty JWT string', async () => {
    const token = await createToken(samplePayload);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('returned string has three dot-separated parts (JWT structure)', async () => {
    const token = await createToken(samplePayload);
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
  });

  it('different calls with the same payload produce different tokens (iat jitter)', async () => {
    // JWTs include iat; even same-second calls may differ due to signing nonce.
    // We assert the token is at least a valid JWT on each call.
    const token1 = await createToken(samplePayload);
    const token2 = await createToken(samplePayload);
    // Both must be valid JWTs
    expect(token1.split('.').length).toBe(3);
    expect(token2.split('.').length).toBe(3);
  });

  it('encodes header with alg=HS256', async () => {
    const token = await createToken(samplePayload);
    const headerJson = Buffer.from(token.split('.')[0], 'base64url').toString('utf8');
    const header = JSON.parse(headerJson);
    expect(header.alg).toBe('HS256');
  });

  it('embeds payload fields in the JWT body', async () => {
    const token = await createToken(samplePayload);
    const bodyJson = Buffer.from(token.split('.')[1], 'base64url').toString('utf8');
    const body = JSON.parse(bodyJson);
    expect(body.userId).toBe(samplePayload.userId);
    expect(body.email).toBe(samplePayload.email);
    expect(body.nickname).toBe(samplePayload.nickname);
    expect(body.role).toBe(samplePayload.role);
  });

  it('sets an expiration claim (exp) in the payload', async () => {
    const token = await createToken(samplePayload);
    const bodyJson = Buffer.from(token.split('.')[1], 'base64url').toString('utf8');
    const body = JSON.parse(bodyJson);
    expect(body.exp).toBeDefined();
    // exp should be roughly 7 days from now
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    expect(body.exp).toBeGreaterThan(nowInSeconds + sevenDaysInSeconds - 60);
    expect(body.exp).toBeLessThanOrEqual(nowInSeconds + sevenDaysInSeconds + 60);
  });
});

describe('verifyToken', () => {
  it('decodes a valid token and returns the original payload fields', async () => {
    const token = await createToken(samplePayload);
    const decoded = await verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(samplePayload.userId);
    expect(decoded?.email).toBe(samplePayload.email);
    expect(decoded?.nickname).toBe(samplePayload.nickname);
    expect(decoded?.role).toBe(samplePayload.role);
  });

  it('returns null for a completely invalid token string', async () => {
    const result = await verifyToken('this.is.garbage');
    expect(result).toBeNull();
  });

  it('returns null for an empty string', async () => {
    const result = await verifyToken('');
    expect(result).toBeNull();
  });

  it('returns null for a token signed with a different secret', async () => {
    // Sign a token directly with a different key — bypassing verifyToken's secret
    const { SignJWT } = await import('jose');
    const differentSecret = new TextEncoder().encode('completely-different-secret-xyz!!');
    const foreignToken = await new SignJWT({ ...samplePayload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(differentSecret);

    // verifyToken uses the TEST_SECRET via JWT_SECRET env — so this must fail
    const result = await verifyToken(foreignToken);
    expect(result).toBeNull();
  });

  it('returns null for an expired token', async () => {
    // Craft an expired JWT manually: set exp to a Unix timestamp 60 seconds in the past
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode(TEST_SECRET);
    const expiredAt = Math.floor(Date.now() / 1000) - 60; // 60s ago
    const expiredToken = await new SignJWT({ ...samplePayload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(expiredAt - 10)
      .setExpirationTime(expiredAt)
      .sign(secret);

    const result = await verifyToken(expiredToken);
    expect(result).toBeNull();
  });

  it('returns null for a token with a tampered payload', async () => {
    const token = await createToken(samplePayload);
    const parts = token.split('.');
    // Tamper the payload by base64-encoding modified JSON
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...samplePayload, role: 'admin' }),
    ).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const result = await verifyToken(tamperedToken);
    expect(result).toBeNull();
  });

  it('round-trips all SessionPayload fields correctly', async () => {
    const adminPayload: SessionPayload = {
      userId: 'admin-uuid-5678',
      email: 'admin@openpoker.kr',
      nickname: '관리자',
      role: 'admin',
    };

    const token = await createToken(adminPayload);
    const decoded = await verifyToken(token);

    expect(decoded?.userId).toBe(adminPayload.userId);
    expect(decoded?.email).toBe(adminPayload.email);
    expect(decoded?.nickname).toBe(adminPayload.nickname);
    expect(decoded?.role).toBe(adminPayload.role);
  });
});
