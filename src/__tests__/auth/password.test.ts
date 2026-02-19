import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('MySecret123!');
    // bcrypt hashes always start with $2a$, $2b$, or $2y$ followed by cost param
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });

  it('produces a hash that is different from the plaintext password', async () => {
    const password = 'plainTextPassword';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
  });

  it('same password hashed twice produces different hashes (salt randomness)', async () => {
    const password = 'SamePassword!';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });

  it('different passwords produce different hashes', async () => {
    const hash1 = await hashPassword('PasswordOne');
    const hash2 = await hashPassword('PasswordTwo');
    expect(hash1).not.toBe(hash2);
  });

  it('handles special characters in the password', async () => {
    const password = '!@#$%^&*()_+-=[]{}|;\':",./<>?';
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
  });
});

describe('verifyPassword', () => {
  it('returns true for the correct password against its hash', async () => {
    const password = 'CorrectPassword!';
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it('returns false for an incorrect password', async () => {
    const hash = await hashPassword('RealPassword!');
    const result = await verifyPassword('WrongPassword!', hash);
    expect(result).toBe(false);
  });

  it('returns false for an empty string against a real hash', async () => {
    const hash = await hashPassword('SomePassword');
    const result = await verifyPassword('', hash);
    expect(result).toBe(false);
  });

  it('returns false for a hash compared against itself (not a password)', async () => {
    const hash = await hashPassword('Password123');
    // Passing the hash as both arguments — the hash is not the original password
    const result = await verifyPassword(hash, hash);
    expect(result).toBe(false);
  });

  it('correctly verifies passwords with special characters', async () => {
    const password = 'P@$$w0rd!#%';
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword('P@$$w0rd!#', hash)).toBe(false);
  });

  it('is case-sensitive', async () => {
    const password = 'CaseSensitive';
    const hash = await hashPassword(password);
    expect(await verifyPassword('casesensitive', hash)).toBe(false);
    expect(await verifyPassword('CASESENSITIVE', hash)).toBe(false);
    expect(await verifyPassword(password, hash)).toBe(true);
  });
});
