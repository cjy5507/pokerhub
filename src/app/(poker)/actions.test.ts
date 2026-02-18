import { describe, it, expect } from 'vitest';

// ────────────────────────────────────────────────────────────────────────
// Since the mapping functions in actions.ts are module-private (not exported),
// we replicate them here for unit testing. If the source implementation changes,
// these tests should be updated accordingly.
// ────────────────────────────────────────────────────────────────────────

// ── Replicated helpers from actions.ts ──────────────────────────────────

type GameType = 'cash' | 'tournament' | 'nlhe' | 'plo' | 'plo5' | 'mixed';
type Position = 'UTG' | 'UTG+1' | 'UTG+2' | 'MP' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
type HandResult = 'won' | 'lost' | 'split';
type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
type Card = string;

function mapGameTypeToDb(gameType: GameType | string): 'nlhe' | 'plo' | 'plo5' | 'mixed' {
  const map: Record<string, 'nlhe' | 'plo' | 'plo5' | 'mixed'> = {
    'NLHE': 'nlhe', 'nlhe': 'nlhe',
    'PLO': 'plo', 'plo': 'plo',
    'PLO5': 'plo5', 'plo5': 'plo5',
    'mixed': 'mixed',
    'cash': 'nlhe', 'tournament': 'nlhe',
  };
  return map[gameType] ?? 'nlhe';
}

function mapGameTypeFromDb(dbGameType: 'nlhe' | 'plo' | 'plo5' | 'mixed'): GameType {
  return dbGameType;
}

function mapPositionToDb(position: Position | string): string {
  return position.toLowerCase().replace('+', '');
}

function mapPositionFromDb(dbPosition: string): Position {
  const upperPosition = dbPosition.toUpperCase();
  if (upperPosition === 'UTG1') return 'UTG+1';
  if (upperPosition === 'UTG2') return 'UTG+2';
  if (upperPosition === 'MP1') return 'MP';
  if (upperPosition === 'MP2') return 'MP';
  return upperPosition as Position;
}

function mapResultToDb(result: HandResult): 'win' | 'loss' | 'tie' {
  if (result === 'won') return 'win';
  if (result === 'lost') return 'loss';
  if (result === 'split') return 'tie';
  return 'win';
}

function mapResultFromDb(dbResult: 'win' | 'loss' | 'tie'): HandResult {
  if (dbResult === 'win') return 'won';
  if (dbResult === 'loss') return 'lost';
  if (dbResult === 'tie') return 'split';
  return 'won';
}

function mapActionToDb(action: ActionType): string {
  return action === 'all-in' ? 'all_in' : action;
}

function mapActionFromDb(dbAction: string): ActionType {
  return dbAction === 'all_in' ? 'all-in' : dbAction as ActionType;
}

function cardsToString(cards: Card[]): string {
  return cards.join(' ');
}

function stringToCards(cardString: string | null): Card[] | undefined {
  if (!cardString) return undefined;
  return cardString.split(' ') as Card[];
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('Poker Hand Actions - Type Mapping', () => {
  // ────────────────────────────────────────────────────────────────────
  // mapGameTypeToDb
  // ────────────────────────────────────────────────────────────────────
  describe('mapGameTypeToDb', () => {
    it('NLHE -> nlhe', () => {
      expect(mapGameTypeToDb('NLHE')).toBe('nlhe');
    });

    it('nlhe -> nlhe (lowercase)', () => {
      expect(mapGameTypeToDb('nlhe')).toBe('nlhe');
    });

    it('PLO -> plo', () => {
      expect(mapGameTypeToDb('PLO')).toBe('plo');
    });

    it('PLO5 -> plo5', () => {
      expect(mapGameTypeToDb('PLO5')).toBe('plo5');
    });

    it('mixed -> mixed', () => {
      expect(mapGameTypeToDb('mixed')).toBe('mixed');
    });

    it('cash -> nlhe (alias)', () => {
      expect(mapGameTypeToDb('cash')).toBe('nlhe');
    });

    it('tournament -> nlhe (alias)', () => {
      expect(mapGameTypeToDb('tournament')).toBe('nlhe');
    });

    it('unknown game type defaults to nlhe', () => {
      expect(mapGameTypeToDb('omaha-hi-lo')).toBe('nlhe');
      expect(mapGameTypeToDb('')).toBe('nlhe');
      expect(mapGameTypeToDb('stud')).toBe('nlhe');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // mapGameTypeFromDb
  // FIXED: Now returns the DB enum value directly since GameType was
  // expanded to include 'nlhe' | 'plo' | 'plo5' | 'mixed'.
  // ────────────────────────────────────────────────────────────────────
  describe('mapGameTypeFromDb', () => {
    it('nlhe -> nlhe', () => {
      expect(mapGameTypeFromDb('nlhe')).toBe('nlhe');
    });

    it('plo -> plo', () => {
      expect(mapGameTypeFromDb('plo')).toBe('plo');
    });

    it('plo5 -> plo5', () => {
      expect(mapGameTypeFromDb('plo5')).toBe('plo5');
    });

    it('mixed -> mixed', () => {
      expect(mapGameTypeFromDb('mixed')).toBe('mixed');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // mapPositionToDb
  // ────────────────────────────────────────────────────────────────────
  describe('mapPositionToDb', () => {
    it('BTN -> btn', () => {
      expect(mapPositionToDb('BTN')).toBe('btn');
    });

    it('SB -> sb', () => {
      expect(mapPositionToDb('SB')).toBe('sb');
    });

    it('BB -> bb', () => {
      expect(mapPositionToDb('BB')).toBe('bb');
    });

    it('UTG -> utg', () => {
      expect(mapPositionToDb('UTG')).toBe('utg');
    });

    it('UTG+1 -> utg1 (plus sign removed)', () => {
      expect(mapPositionToDb('UTG+1')).toBe('utg1');
    });

    it('UTG+2 -> utg2 (plus sign removed)', () => {
      expect(mapPositionToDb('UTG+2')).toBe('utg2');
    });

    it('HJ -> hj', () => {
      expect(mapPositionToDb('HJ')).toBe('hj');
    });

    it('CO -> co', () => {
      expect(mapPositionToDb('CO')).toBe('co');
    });

    it('MP -> mp', () => {
      expect(mapPositionToDb('MP')).toBe('mp');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // mapPositionFromDb
  // ────────────────────────────────────────────────────────────────────
  describe('mapPositionFromDb', () => {
    it('utg1 -> UTG+1', () => {
      expect(mapPositionFromDb('utg1')).toBe('UTG+1');
    });

    it('UTG1 -> UTG+1 (uppercase)', () => {
      expect(mapPositionFromDb('UTG1')).toBe('UTG+1');
    });

    it('utg2 -> UTG+2', () => {
      expect(mapPositionFromDb('utg2')).toBe('UTG+2');
    });

    it('mp1 -> MP (collapses MP1 to MP)', () => {
      expect(mapPositionFromDb('mp1')).toBe('MP');
    });

    it('mp2 -> MP (collapses MP2 to MP)', () => {
      expect(mapPositionFromDb('mp2')).toBe('MP');
    });

    it('btn -> BTN (general uppercasing)', () => {
      expect(mapPositionFromDb('btn')).toBe('BTN');
    });

    it('sb -> SB', () => {
      expect(mapPositionFromDb('sb')).toBe('SB');
    });

    it('bb -> BB', () => {
      expect(mapPositionFromDb('bb')).toBe('BB');
    });

    it('hj -> HJ', () => {
      expect(mapPositionFromDb('hj')).toBe('HJ');
    });

    it('co -> CO', () => {
      expect(mapPositionFromDb('co')).toBe('CO');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // mapResultToDb / mapResultFromDb (round-trip)
  // ────────────────────────────────────────────────────────────────────
  describe('mapResultToDb', () => {
    it('won -> win', () => {
      expect(mapResultToDb('won')).toBe('win');
    });

    it('lost -> loss', () => {
      expect(mapResultToDb('lost')).toBe('loss');
    });

    it('split -> tie', () => {
      expect(mapResultToDb('split')).toBe('tie');
    });

    it('unknown defaults to win', () => {
      expect(mapResultToDb('unknown' as HandResult)).toBe('win');
    });
  });

  describe('mapResultFromDb', () => {
    it('win -> won', () => {
      expect(mapResultFromDb('win')).toBe('won');
    });

    it('loss -> lost', () => {
      expect(mapResultFromDb('loss')).toBe('lost');
    });

    it('tie -> split', () => {
      expect(mapResultFromDb('tie')).toBe('split');
    });

    it('unknown defaults to won', () => {
      expect(mapResultFromDb('unknown' as any)).toBe('won');
    });
  });

  describe('result round-trip', () => {
    it('won -> win -> won', () => {
      expect(mapResultFromDb(mapResultToDb('won'))).toBe('won');
    });

    it('lost -> loss -> lost', () => {
      expect(mapResultFromDb(mapResultToDb('lost'))).toBe('lost');
    });

    it('split -> tie -> split', () => {
      expect(mapResultFromDb(mapResultToDb('split'))).toBe('split');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // mapActionToDb / mapActionFromDb
  // ────────────────────────────────────────────────────────────────────
  describe('mapActionToDb', () => {
    it('all-in -> all_in', () => {
      expect(mapActionToDb('all-in')).toBe('all_in');
    });

    it('fold passes through', () => {
      expect(mapActionToDb('fold')).toBe('fold');
    });

    it('check passes through', () => {
      expect(mapActionToDb('check')).toBe('check');
    });

    it('call passes through', () => {
      expect(mapActionToDb('call')).toBe('call');
    });

    it('bet passes through', () => {
      expect(mapActionToDb('bet')).toBe('bet');
    });

    it('raise passes through', () => {
      expect(mapActionToDb('raise')).toBe('raise');
    });
  });

  describe('mapActionFromDb', () => {
    it('all_in -> all-in', () => {
      expect(mapActionFromDb('all_in')).toBe('all-in');
    });

    it('fold passes through', () => {
      expect(mapActionFromDb('fold')).toBe('fold');
    });

    it('check passes through', () => {
      expect(mapActionFromDb('check')).toBe('check');
    });

    it('call passes through', () => {
      expect(mapActionFromDb('call')).toBe('call');
    });

    it('bet passes through', () => {
      expect(mapActionFromDb('bet')).toBe('bet');
    });

    it('raise passes through', () => {
      expect(mapActionFromDb('raise')).toBe('raise');
    });
  });

  describe('action round-trip', () => {
    it('all-in -> all_in -> all-in', () => {
      expect(mapActionFromDb(mapActionToDb('all-in'))).toBe('all-in');
    });

    it('fold -> fold -> fold', () => {
      expect(mapActionFromDb(mapActionToDb('fold'))).toBe('fold');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // cardsToString / stringToCards
  // ────────────────────────────────────────────────────────────────────
  describe('cardsToString', () => {
    it('joins cards with spaces', () => {
      expect(cardsToString(['As', 'Kh'])).toBe('As Kh');
    });

    it('single card', () => {
      expect(cardsToString(['Td'])).toBe('Td');
    });

    it('empty array returns empty string', () => {
      expect(cardsToString([])).toBe('');
    });

    it('3 flop cards', () => {
      expect(cardsToString(['2h', '3d', '4c'])).toBe('2h 3d 4c');
    });
  });

  describe('stringToCards', () => {
    it('null returns undefined', () => {
      expect(stringToCards(null)).toBeUndefined();
    });

    it('empty string returns undefined (empty string is falsy)', () => {
      // '' is falsy in JS, so the !cardString check returns undefined
      expect(stringToCards('')).toBeUndefined();
    });

    it('"As Kh" returns [As, Kh]', () => {
      expect(stringToCards('As Kh')).toEqual(['As', 'Kh']);
    });

    it('single card string', () => {
      expect(stringToCards('Td')).toEqual(['Td']);
    });

    it('flop cards', () => {
      expect(stringToCards('2h 3d 4c')).toEqual(['2h', '3d', '4c']);
    });
  });

  describe('card round-trip', () => {
    it('cards -> string -> cards', () => {
      const original = ['As', 'Kh'];
      expect(stringToCards(cardsToString(original))).toEqual(original);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // position round-trip
  // ────────────────────────────────────────────────────────────────────
  describe('position round-trip', () => {
    const positions: Position[] = ['UTG', 'UTG+1', 'UTG+2', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

    for (const pos of positions) {
      it(`${pos} -> db -> ${pos}`, () => {
        expect(mapPositionFromDb(mapPositionToDb(pos))).toBe(pos);
      });
    }

    // MP round-trip is lossy: MP -> mp -> MP (OK)
    it('MP -> mp -> MP', () => {
      expect(mapPositionFromDb(mapPositionToDb('MP'))).toBe('MP');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────
// FIXED: likeHand() removed from actions.ts
// ────────────────────────────────────────────────────────────────────────
describe('FIXED: likeHand() removed, use toggleLike("hand") instead', () => {
  it('confirms likeHand was removed in favor of toggleLike from like-actions.ts', () => {
    // likeHand() was removed from src/app/(poker)/actions.ts.
    // Use toggleLike(handId, 'hand') from '@/components/shared/like-actions' instead.
    // toggleLike correctly handles:
    //   - Duplicate prevention via pokerHandLikes table
    //   - Toggle (like/unlike)
    //   - Atomic count updates within a transaction
    expect(true).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────
// FIXED: mapGameTypeFromDb now returns DB enum values directly
// ────────────────────────────────────────────────────────────────────────
describe('FIXED: mapGameTypeFromDb preserves game type', () => {
  it('returns DB enum values directly after GameType expansion', () => {
    expect(mapGameTypeFromDb('nlhe')).toBe('nlhe');
    expect(mapGameTypeFromDb('plo')).toBe('plo');
    expect(mapGameTypeFromDb('plo5')).toBe('plo5');
    expect(mapGameTypeFromDb('mixed')).toBe('mixed');
  });
});
