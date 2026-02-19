import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import {
  createChainableMock,
  mockUserSession,
  createTestUser,
  resetMocks,
} from '../helpers/mocks';

// ---------------------------------------------------------------------------
// vi.hoisted() runs BEFORE vi.mock() hoisting AND before any module-level
// variable initialisers, so it is the correct place to create shared mocks
// that need to be referenced inside vi.mock() factory functions.
// ---------------------------------------------------------------------------

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  query: {},
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}));

// next/headers is a Next.js server-only module; stub it so the 'use server'
// file can be imported in a plain Node environment.
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Lazy import — must come AFTER vi.mock() calls
// ---------------------------------------------------------------------------

import { getSession } from '@/lib/auth/session';
import {
  getUserPoints,
  claimCooldownReward,
  buyLotteryTicket,
  spinRoulette,
} from '@/app/(games)/actions';

const mockGetSession = getSession as MockedFunction<typeof getSession>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a mock tx object that mirrors mockDb and supports the same fluent
 * API chains. The transaction callback receives this as its argument.
 */
function createTxMock() {
  return {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    execute: vi.fn(),
    transaction: vi.fn(),
    query: {},
  };
}

/**
 * Configures db.transaction to run the callback synchronously with a
 * freshly-created tx mock, then return whatever the callback returns.
 */
function setupTransactionMock(txOverride?: any) {
  const tx = txOverride ?? createTxMock();
  mockDb.transaction = vi.fn().mockImplementation(async (fn: (tx: any) => any) => fn(tx));
  return tx;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetMocks();
  // Reset all methods on the shared mockDb instance
  mockDb.select = vi.fn();
  mockDb.insert = vi.fn();
  mockDb.update = vi.fn();
  mockDb.delete = vi.fn();
  mockDb.execute = vi.fn();
  mockDb.transaction = vi.fn();
});

// ===========================================================================
// getUserPoints
// ===========================================================================

describe('getUserPoints', () => {
  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await getUserPoints();

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('returns error when user is not found in database', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    // db.select()…limit(1) resolves to empty array → no user
    const chain = createChainableMock([]);
    mockDb.select.mockReturnValue(chain);

    const result = await getUserPoints();

    expect(result.success).toBe(false);
    expect(result.error).toBe('사용자를 찾을 수 없습니다');
  });

  it('returns points successfully for an authenticated user', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 750 });
    const chain = createChainableMock([{ points: user.points }]);
    mockDb.select.mockReturnValue(chain);

    const result = await getUserPoints();

    expect(result.success).toBe(true);
    expect(result.points).toBe(750);
  });

  it('passes the session userId into the query', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const chain = createChainableMock([{ points: 100 }]);
    mockDb.select.mockReturnValue(chain);

    await getUserPoints();

    expect(mockDb.select).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// claimCooldownReward
// ===========================================================================

describe('claimCooldownReward', () => {
  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await claimCooldownReward();

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('returns error and nextClaimAt when cooldown has not expired', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    // Latest claim was 1 minute ago — well within the 5-hour cooldown
    const recentClaimAt = new Date(Date.now() - 60_000);

    // Cooldown check now runs inside the transaction via tx.select
    const tx = setupTransactionMock();
    tx.select = vi.fn().mockReturnValue(createChainableMock([{ claimedAt: recentClaimAt }]));

    const result = await claimCooldownReward();

    expect(result.success).toBe(false);
    expect(result.error).toBe('아직 수확할 수 없습니다');
    expect(result.nextClaimAt).toBeDefined();

    // nextClaimAt should be in the future
    const nextClaim = new Date(result.nextClaimAt as string);
    expect(nextClaim.getTime()).toBeGreaterThan(Date.now());
  });

  it('succeeds on first-ever claim (no previous record)', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const tx = setupTransactionMock();

    // tx.select — no previous cooldown record
    tx.select = vi.fn().mockReturnValue(createChainableMock([]));

    // tx.insert().values() — for cooldown record and point transaction log
    const insertChain1 = createChainableMock([]);
    tx.insert = vi.fn().mockReturnValue(insertChain1);

    // tx.update().set().where().returning() — returns updated points
    const updateChain = createChainableMock([{ points: 550 }]);
    tx.update = vi.fn().mockReturnValue(updateChain);

    const result = await claimCooldownReward();

    expect(result.success).toBe(true);
    expect(result.pointsEarned).toBeDefined();
    expect(result.nextClaimAt).toBeDefined();
  });

  it('succeeds when the cooldown has fully expired', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    // Last claim was 6 hours ago — cooldown is 5 hours
    const expiredClaimAt = new Date(Date.now() - 6 * 60 * 60 * 1000);

    const tx = setupTransactionMock();
    // tx.select — returns expired cooldown record
    tx.select = vi.fn().mockReturnValue(createChainableMock([{ claimedAt: expiredClaimAt }]));
    const insertChain = createChainableMock([]);
    tx.insert = vi.fn().mockReturnValue(insertChain);
    const updateChain = createChainableMock([{ points: 200 }]);
    tx.update = vi.fn().mockReturnValue(updateChain);

    const result = await claimCooldownReward();

    expect(result.success).toBe(true);
    expect(result.nextClaimAt).toBeDefined();
    // nextClaimAt should be ~5 hours from now
    const nextClaim = new Date(result.nextClaimAt as string);
    expect(nextClaim.getTime()).toBeGreaterThan(Date.now());
  });

  it('reward is between MIN_REWARD (10) and MAX_REWARD (100) inclusive', async () => {
    // Run 50 successful claims and verify the reward is always in [10, 100]
    for (let i = 0; i < 50; i++) {
      mockGetSession.mockResolvedValueOnce(mockUserSession as any);

      const tx = setupTransactionMock();
      // tx.select — no previous cooldown record
      tx.select = vi.fn().mockReturnValue(createChainableMock([]));
      const insertChain = createChainableMock([]);
      tx.insert = vi.fn().mockReturnValue(insertChain);
      const updateChain = createChainableMock([{ points: 500 }]);
      tx.update = vi.fn().mockReturnValue(updateChain);

      const result = await claimCooldownReward();

      expect(result.success).toBe(true);
      expect(result.pointsEarned).toBeGreaterThanOrEqual(10);
      expect(result.pointsEarned).toBeLessThanOrEqual(100);
    }
  });

  it('executes the debit and log inside a transaction', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const tx = setupTransactionMock();
    // tx.select — no previous cooldown record
    tx.select = vi.fn().mockReturnValue(createChainableMock([]));
    const insertChain = createChainableMock([]);
    tx.insert = vi.fn().mockReturnValue(insertChain);
    const updateChain = createChainableMock([{ points: 100 }]);
    tx.update = vi.fn().mockReturnValue(updateChain);

    await claimCooldownReward();

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// buyLotteryTicket
// ===========================================================================

describe('buyLotteryTicket', () => {
  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await buyLotteryTicket();

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('returns error when user has insufficient points (< 100)', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    // User with only 50 points — below the 100-point lottery cost
    const user = createTestUser({ points: 50 });

    // Both checks (user points + daily count) now happen inside the transaction
    const tx = setupTransactionMock();
    // First tx.select: fetch user with FOR UPDATE lock
    tx.select = vi.fn().mockReturnValueOnce(createChainableMock([user]));

    const result = await buyLotteryTicket();

    expect(result.success).toBe(false);
    expect(result.error).toBe('포인트가 부족합니다');
  });

  it('returns error when daily purchase limit (5) is exceeded', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 1000 });

    // Both checks happen inside the transaction
    const tx = setupTransactionMock();
    // First tx.select: user with enough points; second tx.select: daily count = 5
    tx.select = vi.fn()
      .mockReturnValueOnce(createChainableMock([user]))
      .mockReturnValueOnce(createChainableMock([{ todayCount: 5 }]));

    const result = await buyLotteryTicket();

    expect(result.success).toBe(false);
    expect(result.error).toBe('오늘의 구매 한도를 초과했습니다 (5장/일)');
  });

  it('returns a ticket object on successful purchase', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 1000 });

    const tx = setupTransactionMock();
    // First tx.select: user; second tx.select: daily count = 0
    tx.select = vi.fn()
      .mockReturnValueOnce(createChainableMock([user]))
      .mockReturnValueOnce(createChainableMock([{ todayCount: 0 }]));

    const newTicket = { id: 'ticket-uuid-1', tier: 'none', prizeAmount: 0 };
    const insertChain = createChainableMock([newTicket]);
    tx.insert = vi.fn().mockReturnValue(insertChain);

    const updateChain = createChainableMock([{ points: 900 }]);
    tx.update = vi.fn().mockReturnValue(updateChain);

    const result = await buyLotteryTicket();

    expect(result.success).toBe(true);
    expect(result.ticket).toBeDefined();
    expect(result.ticket).toHaveProperty('id');
    expect(result.ticket).toHaveProperty('tier');
    expect(result.ticket).toHaveProperty('prizeAmount');
  });

  it('transaction is called during a successful purchase', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 500 });

    const tx = setupTransactionMock();
    // First tx.select: user; second tx.select: daily count = 2
    tx.select = vi.fn()
      .mockReturnValueOnce(createChainableMock([user]))
      .mockReturnValueOnce(createChainableMock([{ todayCount: 2 }]));
    const newTicket = { id: 'ticket-uuid-2', tier: 'fourth', prizeAmount: 100 };
    const insertChain = createChainableMock([newTicket]);
    tx.insert = vi.fn().mockReturnValue(insertChain);
    const updateChain = createChainableMock([{ points: 400 }]);
    tx.update = vi.fn().mockReturnValue(updateChain);

    await buyLotteryTicket();

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it('returns ticket tier that is one of the valid lottery tiers', async () => {
    const validTiers = ['first', 'second', 'third', 'fourth', 'none'];

    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 1000 });

    const tx = setupTransactionMock();
    // First tx.select: user; second tx.select: daily count = 0
    tx.select = vi.fn()
      .mockReturnValueOnce(createChainableMock([user]))
      .mockReturnValueOnce(createChainableMock([{ todayCount: 0 }]));
    const insertChain = createChainableMock([{ id: 'tid', tier: 'none', prizeAmount: 0 }]);
    tx.insert = vi.fn().mockReturnValue(insertChain);
    const updateChain = createChainableMock([{ points: 900 }]);
    tx.update = vi.fn().mockReturnValue(updateChain);

    const result = await buyLotteryTicket();

    expect(result.success).toBe(true);
    expect(validTiers).toContain(result.ticket?.tier);
  });

  it('propagates INSUFFICIENT_POINTS thrown inside transaction as error response', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    // Simulate race condition: transaction itself rejects (no outside selects needed)
    mockDb.transaction = vi.fn().mockRejectedValueOnce(new Error('INSUFFICIENT_POINTS'));

    const result = await buyLotteryTicket();

    expect(result.success).toBe(false);
    expect(result.error).toBe('포인트가 부족합니다');
  });
});

// ===========================================================================
// spinRoulette
// ===========================================================================

describe('spinRoulette', () => {
  it('returns error when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const result = await spinRoulette(100);

    expect(result.success).toBe(false);
    expect(result.error).toBe('로그인이 필요합니다');
  });

  it('returns error for invalid bet amount', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const result = await spinRoulette(75); // 75 is not in [50, 100, 200, 500]

    expect(result.success).toBe(false);
    expect(result.error).toBe('유효하지 않은 베팅 금액입니다');
  });

  it.each([0, 1, 25, 75, 150, 300, 1000])(
    'returns invalid bet error for amount %i',
    async (amount) => {
      mockGetSession.mockResolvedValueOnce(mockUserSession as any);

      const result = await spinRoulette(amount);

      expect(result.success).toBe(false);
      expect(result.error).toBe('유효하지 않은 베팅 금액입니다');
    },
  );

  it('returns error when user has insufficient points', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    // User has 40 points; bet is 50
    const user = createTestUser({ points: 40 });
    mockDb.select.mockReturnValue(createChainableMock([user]));

    const result = await spinRoulette(50);

    expect(result.success).toBe(false);
    expect(result.error).toBe('포인트가 부족합니다');
  });

  it('succeeds with a valid bet and returns multiplier and winAmount', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 1000 });
    mockDb.select.mockReturnValue(createChainableMock([user]));

    const tx = setupTransactionMock();
    const insertChain = createChainableMock([]);
    tx.insert = vi.fn().mockReturnValue(insertChain);
    const updateChain = createChainableMock([{ points: 900 }]);
    tx.update = vi.fn().mockReturnValue(updateChain);

    const result = await spinRoulette(100);

    expect(result.success).toBe(true);
    expect(result.multiplier).toBeDefined();
    expect(result.winAmount).toBeDefined();
  });

  it.each([50, 100, 200, 500])('accepts valid bet amount %i', async (betAmount) => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 1000 });
    mockDb.select.mockReturnValue(createChainableMock([user]));

    const tx = setupTransactionMock();
    const insertChain = createChainableMock([]);
    tx.insert = vi.fn().mockReturnValue(insertChain);
    const updateChain = createChainableMock([{ points: 800 }]);
    tx.update = vi.fn().mockReturnValue(updateChain);

    const result = await spinRoulette(betAmount);

    expect(result.success).toBe(true);
  });

  it('multiplier is one of the defined roulette outcomes', async () => {
    const validMultipliers = ['0x', '0.5x', '1x', '2x', '3x', '5x'];

    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 1000 });
    mockDb.select.mockReturnValue(createChainableMock([user]));

    const tx = setupTransactionMock();
    const insertChain = createChainableMock([]);
    tx.insert = vi.fn().mockReturnValue(insertChain);
    const updateChain = createChainableMock([{ points: 900 }]);
    tx.update = vi.fn().mockReturnValue(updateChain);

    const result = await spinRoulette(100);

    expect(result.success).toBe(true);
    expect(validMultipliers).toContain(result.multiplier);
  });

  it('winAmount equals betAmount * numeric part of multiplier', async () => {
    // We cannot control crypto.randomInt, so we run multiple spins and
    // verify the invariant holds for whatever multiplier is chosen.
    for (let i = 0; i < 20; i++) {
      mockGetSession.mockResolvedValueOnce(mockUserSession as any);

      const user = createTestUser({ points: 10_000 });
      mockDb.select.mockReturnValue(createChainableMock([user]));

      const tx = setupTransactionMock();
      tx.insert = vi.fn().mockReturnValue(createChainableMock([]));
      tx.update = vi.fn().mockReturnValue(createChainableMock([{ points: 9000 }]));

      const betAmount = 100;
      const result = await spinRoulette(betAmount);

      expect(result.success).toBe(true);
      const multiplierValue = parseFloat((result.multiplier as string).replace('x', ''));
      expect(result.winAmount).toBe(betAmount * multiplierValue);
    }
  });

  it('calls db.transaction during a successful spin', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 500 });
    mockDb.select.mockReturnValue(createChainableMock([user]));

    const tx = setupTransactionMock();
    tx.insert = vi.fn().mockReturnValue(createChainableMock([]));
    tx.update = vi.fn().mockReturnValue(createChainableMock([{ points: 400 }]));

    await spinRoulette(100);

    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
  });

  it('propagates INSUFFICIENT_POINTS from inside transaction as error response', async () => {
    mockGetSession.mockResolvedValueOnce(mockUserSession as any);

    const user = createTestUser({ points: 1000 });
    mockDb.select.mockReturnValue(createChainableMock([user]));

    mockDb.transaction = vi.fn().mockRejectedValueOnce(new Error('INSUFFICIENT_POINTS'));

    const result = await spinRoulette(200);

    expect(result.success).toBe(false);
    expect(result.error).toBe('포인트가 부족합니다');
  });
});
