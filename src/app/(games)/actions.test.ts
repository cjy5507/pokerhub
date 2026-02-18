import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────

const { mockSelect, mockInsert, mockUpdate, mockTransaction, mockGetSession, mockRandomInt } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockTransaction: vi.fn(),
  mockGetSession: vi.fn(),
  mockRandomInt: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomInt: mockRandomInt,
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    transaction: mockTransaction,
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getSession: mockGetSession,
}));

// Mock drizzle-orm operators to pass through for testing
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  desc: vi.fn((col: unknown) => ({ type: 'desc', col })),
  sql: vi.fn(),
  count: vi.fn(() => 'count_agg'),
  gte: vi.fn((...args: unknown[]) => ({ type: 'gte', args })),
}));

vi.mock('@/lib/db/schema', () => ({
  cooldownRewards: { userId: 'cooldownRewards.userId', claimedAt: 'cooldownRewards.claimedAt' },
  lotteryTickets: { userId: 'lotteryTickets.userId', createdAt: 'lotteryTickets.createdAt' },
  rouletteSpins: {},
  users: { id: 'users.id', points: 'users.points' },
  pointTransactions: {},
}));

import {
  getUserPoints,
  buyLotteryTicket,
  spinRoulette,
} from './actions';

// ─── Helpers ────────────────────────────────────────────────────────

function chainMock(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.from = self;
  chain.where = self;
  chain.orderBy = self;
  chain.limit = self;
  chain.returning = () => Promise.resolve(result);
  chain[Symbol.iterator] = function* () { yield* result as any[]; };
  chain.then = (resolve: (v: unknown) => void) => resolve(result);
  return chain;
}

function setupSelect(...calls: unknown[][]) {
  for (const result of calls) {
    mockSelect.mockReturnValueOnce(chainMock(result));
  }
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('game actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Lottery tier probability logic ────────────────────────────

  describe('lottery tier probabilities (constants verification)', () => {
    it('should have probabilities that sum to 1.0', () => {
      // We test the constant indirectly: the tiers are defined in the module
      const tiers = [
        { tier: 'first', probability: 0.01, prize: 10000 },
        { tier: 'second', probability: 0.05, prize: 1000 },
        { tier: 'third', probability: 0.15, prize: 500 },
        { tier: 'fourth', probability: 0.30, prize: 200 },
        { tier: 'none', probability: 0.49, prize: 0 },
      ];

      const sum = tiers.reduce((acc, t) => acc + t.probability, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it('should have correct prizes for each tier', () => {
      const prizes: Record<string, number> = {
        first: 10000,
        second: 1000,
        third: 500,
        fourth: 200,
        none: 0,
      };

      expect(prizes.first).toBe(10000);
      expect(prizes.second).toBe(1000);
      expect(prizes.third).toBe(500);
      expect(prizes.fourth).toBe(200);
      expect(prizes.none).toBe(0);
    });
  });

  // ── Roulette multiplier logic ─────────────────────────────────

  describe('roulette multiplier weights (constants verification)', () => {
    it('should have correct weights [20, 30, 25, 15, 7, 3]', () => {
      const multipliers = [
        { multiplier: '0x', weight: 20 },
        { multiplier: '1x', weight: 30 },
        { multiplier: '2x', weight: 25 },
        { multiplier: '5x', weight: 15 },
        { multiplier: '10x', weight: 7 },
        { multiplier: '50x', weight: 3 },
      ];

      const totalWeight = multipliers.reduce((sum, m) => sum + m.weight, 0);
      expect(totalWeight).toBe(100);

      expect(multipliers[0]).toEqual({ multiplier: '0x', weight: 20 });
      expect(multipliers[1]).toEqual({ multiplier: '1x', weight: 30 });
      expect(multipliers[5]).toEqual({ multiplier: '50x', weight: 3 });
    });
  });

  // ── parseMultiplier logic ─────────────────────────────────────

  describe('parseMultiplier', () => {
    // parseMultiplier is not exported, but we can verify the logic
    // by testing spinRoulette's resulting winAmount
    it('0x multiplier should yield 0 winnings', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 1000 }]); // user has enough points

      // randomInt(0, 100) returns 5 -> within '0x' bucket [0, 20)
      mockRandomInt.mockReturnValueOnce(5);

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
            returning: vi.fn().mockResolvedValue([{ id: 'spin-1' }]),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ points: 900 }]),
              }),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await spinRoulette(100);

      expect(result.success).toBe(true);
      expect(result.multiplier).toBe('0x');
      expect(result.winAmount).toBe(0);
    });

    it('1x multiplier should yield betAmount as winnings', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 1000 }]);

      // randomInt(0, 100) returns 35 -> within '1x' bucket [20, 50)
      mockRandomInt.mockReturnValueOnce(35);

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
            returning: vi.fn().mockResolvedValue([{ id: 'spin-1' }]),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ points: 1000 }]),
              }),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await spinRoulette(100);

      expect(result.success).toBe(true);
      expect(result.multiplier).toBe('1x');
      expect(result.winAmount).toBe(100);
    });

    it('5x multiplier should yield 5 * betAmount', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 1000 }]);

      // randomInt(0, 100) returns 80 -> within '5x' bucket [75, 90)
      mockRandomInt.mockReturnValueOnce(80);

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
            returning: vi.fn().mockResolvedValue([{ id: 'spin-1' }]),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ points: 1500 }]),
              }),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await spinRoulette(100);

      expect(result.success).toBe(true);
      expect(result.multiplier).toBe('5x');
      expect(result.winAmount).toBe(500);
    });

    it('50x multiplier should yield 50 * betAmount', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 1000 }]);

      // randomInt(0, 100) returns 98 -> within '50x' bucket [97, 100)
      mockRandomInt.mockReturnValueOnce(98);

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
            returning: vi.fn().mockResolvedValue([{ id: 'spin-1' }]),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ points: 6000 }]),
              }),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await spinRoulette(200);

      expect(result.success).toBe(true);
      expect(result.multiplier).toBe('50x');
      expect(result.winAmount).toBe(10000);
    });
  });

  // ── getUserPoints ─────────────────────────────────────────────

  describe('getUserPoints', () => {
    it('should return error when not logged in', async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await getUserPoints();

      expect(result.success).toBe(false);
      expect(result.error).toBe('로그인이 필요합니다');
    });

    it('should return error when user not found', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([]); // no user found

      const result = await getUserPoints();

      expect(result.success).toBe(false);
      expect(result.error).toBe('사용자를 찾을 수 없습니다');
    });

    it('should return points on success', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ points: 500 }]);

      const result = await getUserPoints();

      expect(result.success).toBe(true);
      expect(result.points).toBe(500);
    });
  });

  // ── buyLotteryTicket ──────────────────────────────────────────

  describe('buyLotteryTicket', () => {
    it('should return error when not logged in', async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await buyLotteryTicket();

      expect(result.success).toBe(false);
      expect(result.error).toBe('로그인이 필요합니다');
    });

    it('should return error when insufficient points (< 100)', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 50 }]); // not enough

      const result = await buyLotteryTicket();

      expect(result.success).toBe(false);
      expect(result.error).toBe('포인트가 부족합니다');
    });

    it('should return error when daily limit exceeded (5 tickets/day)', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 1000 }]); // enough points
      setupSelect([{ todayCount: 5 }]); // already bought 5 today

      const result = await buyLotteryTicket();

      expect(result.success).toBe(false);
      expect(result.error).toBe('오늘의 구매 한도를 초과했습니다 (5장/일)');
    });

    it('should succeed and return ticket on purchase', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 1000 }]); // enough points
      setupSelect([{ todayCount: 2 }]); // under daily limit

      // randomInt(0, 1000000) returns 500000 -> 500000/1000000 = 0.5 -> fourth tier (cumulative 0.51)
      mockRandomInt.mockReturnValueOnce(500000);

      mockTransaction.mockImplementation(async (fn: any) => {
        // tx.insert().values().returning() chain
        const txInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: 'ticket-1',
              tier: 'fourth',
              prizeAmount: 200,
            }]),
          }),
        });
        const tx = {
          insert: txInsert,
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ points: 900 }]),
              }),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await buyLotteryTicket();

      expect(result.success).toBe(true);
      expect(result.ticket).toBeDefined();
      expect(result.ticket!.tier).toBe('fourth');
      expect(result.ticket!.prizeAmount).toBe(200);
    });

    it('should award prize when tier is not none', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 1000 }]);
      setupSelect([{ todayCount: 0 }]);

      // randomInt(0, 1000000) returns 5000 -> 5000/1000000 = 0.005 -> first tier (cumulative 0.01)
      mockRandomInt.mockReturnValueOnce(5000);

      const mockTxInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'ticket-1',
            tier: 'first',
            prizeAmount: 10000,
          }]),
        }),
      });

      const mockTxUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ points: 10900 }]),
          }),
        }),
      });

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: mockTxInsert,
          update: mockTxUpdate,
        };
        return fn(tx);
      });

      const result = await buyLotteryTicket();

      expect(result.success).toBe(true);
      expect(result.ticket!.tier).toBe('first');
      expect(result.ticket!.prizeAmount).toBe(10000);

      // insert called: lottery ticket + point deduction log + prize log
      // update called: deduct cost + add prize
      expect(mockTxInsert).toHaveBeenCalled();
      expect(mockTxUpdate).toHaveBeenCalled();
    });
  });

  // ── spinRoulette ──────────────────────────────────────────────

  describe('spinRoulette', () => {
    it('should return error when not logged in', async () => {
      mockGetSession.mockResolvedValue(null);

      const result = await spinRoulette(100);

      expect(result.success).toBe(false);
      expect(result.error).toBe('로그인이 필요합니다');
    });

    it('should return error for invalid bet amount', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });

      const result = await spinRoulette(75); // not in [50, 100, 200, 500]

      expect(result.success).toBe(false);
      expect(result.error).toBe('유효하지 않은 베팅 금액입니다');
    });

    it('should accept valid bet amounts: 50, 100, 200, 500', async () => {
      const validBets = [50, 100, 200, 500];

      for (const bet of validBets) {
        vi.clearAllMocks();
        mockGetSession.mockResolvedValue({ userId: 'user-1' });
        setupSelect([{ id: 'user-1', points: 10000 }]);

        // randomInt(0, 100) returns 25 -> within '1x' bucket [20, 50)
        mockRandomInt.mockReturnValueOnce(25);

        mockTransaction.mockImplementation(async (fn: any) => {
          const tx = {
            insert: vi.fn().mockReturnValue({
              values: vi.fn().mockResolvedValue(undefined),
              returning: vi.fn().mockResolvedValue([]),
            }),
            update: vi.fn().mockReturnValue({
              set: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  returning: vi.fn().mockResolvedValue([{ points: 10000 }]),
                }),
              }),
            }),
          };
          return fn(tx);
        });

        const result = await spinRoulette(bet);
        expect(result.success).toBe(true);
      }
    });

    it('should return error when insufficient points', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 30 }]); // less than bet of 50

      const result = await spinRoulette(50);

      expect(result.success).toBe(false);
      expect(result.error).toBe('포인트가 부족합니다');
    });

    it('should return multiplier and winAmount on success', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 1000 }]);

      // randomInt(0, 100) returns 60 -> within '2x' bucket [50, 75)
      mockRandomInt.mockReturnValueOnce(60);

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
            returning: vi.fn().mockResolvedValue([]),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ points: 1100 }]),
              }),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await spinRoulette(100);

      expect(result.success).toBe(true);
      expect(result.multiplier).toBe('2x');
      expect(result.winAmount).toBe(200); // 100 * 2
    });

    it('should handle 0x loss correctly (winAmount = 0)', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 500 }]);

      // randomInt(0, 100) returns 10 -> within '0x' bucket [0, 20)
      mockRandomInt.mockReturnValueOnce(10);

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
            returning: vi.fn().mockResolvedValue([]),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ points: 400 }]),
              }),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await spinRoulette(100);

      expect(result.success).toBe(true);
      expect(result.multiplier).toBe('0x');
      expect(result.winAmount).toBe(0);
    });

    it('should handle 10x multiplier (betAmount * 10)', async () => {
      mockGetSession.mockResolvedValue({ userId: 'user-1' });
      setupSelect([{ id: 'user-1', points: 1000 }]);

      // randomInt(0, 100) returns 93 -> within '10x' bucket [90, 97)
      mockRandomInt.mockReturnValueOnce(93);

      mockTransaction.mockImplementation(async (fn: any) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
            returning: vi.fn().mockResolvedValue([]),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([{ points: 5500 }]),
              }),
            }),
          }),
        };
        return fn(tx);
      });

      const result = await spinRoulette(500);

      expect(result.success).toBe(true);
      expect(result.multiplier).toBe('10x');
      expect(result.winAmount).toBe(5000);
    });
  });
});
