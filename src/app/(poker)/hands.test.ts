import { describe, it, expect } from 'vitest';
import { parseCard } from '@/components/poker/CardRenderer';

// ============================================================
// parseCard tests
// ============================================================

describe('parseCard', () => {
  it('파싱: Ah → { rank: A, suit: h }', () => {
    expect(parseCard('Ah')).toEqual({ rank: 'A', suit: 'h' });
  });

  it('파싱: Td → { rank: T, suit: d }', () => {
    expect(parseCard('Td')).toEqual({ rank: 'T', suit: 'd' });
  });

  it('파싱: 2s → { rank: 2, suit: s }', () => {
    expect(parseCard('2s')).toEqual({ rank: '2', suit: 's' });
  });

  it('파싱: Kc → { rank: K, suit: c }', () => {
    expect(parseCard('Kc')).toEqual({ rank: 'K', suit: 'c' });
  });

  it('파싱: Qh → { rank: Q, suit: h }', () => {
    expect(parseCard('Qh')).toEqual({ rank: 'Q', suit: 'h' });
  });

  it('파싱: Jd → { rank: J, suit: d }', () => {
    expect(parseCard('Jd')).toEqual({ rank: 'J', suit: 'd' });
  });

  it('파싱: 9c → { rank: 9, suit: c }', () => {
    expect(parseCard('9c')).toEqual({ rank: '9', suit: 'c' });
  });

  it('소문자 rank 입력도 대문자로 파싱: ah → { rank: A, suit: h }', () => {
    expect(parseCard('ah')).toEqual({ rank: 'A', suit: 'h' });
  });

  it('대문자 suit 입력도 소문자로 파싱: AH → { rank: A, suit: h }', () => {
    expect(parseCard('AH')).toEqual({ rank: 'A', suit: 'h' });
  });

  it('빈 문자열 → null', () => {
    expect(parseCard('')).toBeNull();
  });

  it('한 글자 → null', () => {
    expect(parseCard('A')).toBeNull();
  });

  it('세 글자 → null', () => {
    expect(parseCard('Ahd')).toBeNull();
  });

  it('잘못된 rank → null', () => {
    expect(parseCard('Xh')).toBeNull();
  });

  it('잘못된 suit → null', () => {
    expect(parseCard('Ax')).toBeNull();
  });

  it('숫자 1은 유효하지 않은 rank → null', () => {
    expect(parseCard('1h')).toBeNull();
  });

  it('모든 유효한 rank를 파싱', () => {
    const validRanks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    for (const rank of validRanks) {
      const result = parseCard(`${rank}h`);
      expect(result).toEqual({ rank, suit: 'h' });
    }
  });

  it('모든 유효한 suit를 파싱', () => {
    const validSuits = ['h', 'd', 's', 'c'];
    for (const suit of validSuits) {
      const result = parseCard(`A${suit}`);
      expect(result).toEqual({ rank: 'A', suit });
    }
  });
});

// ============================================================
// cardsToString / stringToCards logic tests
// (These mirror the private helper functions in actions.ts)
// ============================================================

function cardsToString(cards: string[]): string {
  return cards.join(' ');
}

function stringToCards(cardString: string | null): string[] | undefined {
  if (!cardString) return undefined;
  return cardString.split(' ');
}

describe('cardsToString', () => {
  it('카드 배열을 공백 구분 문자열로 변환', () => {
    expect(cardsToString(['Ah', 'Kd'])).toBe('Ah Kd');
  });

  it('한 장짜리 배열', () => {
    expect(cardsToString(['Ts'])).toBe('Ts');
  });

  it('빈 배열 → 빈 문자열', () => {
    expect(cardsToString([])).toBe('');
  });

  it('세 장 (플롭)', () => {
    expect(cardsToString(['Ah', 'Kd', 'Qc'])).toBe('Ah Kd Qc');
  });
});

describe('stringToCards', () => {
  it('공백 구분 문자열을 카드 배열로 변환', () => {
    expect(stringToCards('Ah Kd')).toEqual(['Ah', 'Kd']);
  });

  it('한 장짜리 문자열', () => {
    expect(stringToCards('Ts')).toEqual(['Ts']);
  });

  it('null → undefined', () => {
    expect(stringToCards(null)).toBeUndefined();
  });

  it('빈 문자열 → undefined', () => {
    expect(stringToCards('')).toBeUndefined();
  });

  it('세 장 (플롭)', () => {
    expect(stringToCards('Ah Kd Qc')).toEqual(['Ah', 'Kd', 'Qc']);
  });
});

// ============================================================
// Position mapping logic tests
// (Mirror private helpers in actions.ts)
// ============================================================

function mapPositionToDb(position: string): string {
  return position.toLowerCase().replace('+', '');
}

function mapPositionFromDb(dbPosition: string): string {
  const upperPosition = dbPosition.toUpperCase();
  if (upperPosition === 'UTG1') return 'UTG+1';
  if (upperPosition === 'UTG2') return 'UTG+2';
  if (upperPosition === 'MP1') return 'MP';
  if (upperPosition === 'MP2') return 'MP';
  return upperPosition;
}

describe('mapPositionToDb', () => {
  it('UTG → utg', () => {
    expect(mapPositionToDb('UTG')).toBe('utg');
  });

  it('UTG+1 → utg1 (+기호 제거)', () => {
    expect(mapPositionToDb('UTG+1')).toBe('utg1');
  });

  it('UTG+2 → utg2', () => {
    expect(mapPositionToDb('UTG+2')).toBe('utg2');
  });

  it('BTN → btn', () => {
    expect(mapPositionToDb('BTN')).toBe('btn');
  });

  it('SB → sb', () => {
    expect(mapPositionToDb('SB')).toBe('sb');
  });

  it('BB → bb', () => {
    expect(mapPositionToDb('BB')).toBe('bb');
  });

  it('CO → co', () => {
    expect(mapPositionToDb('CO')).toBe('co');
  });

  it('HJ → hj', () => {
    expect(mapPositionToDb('HJ')).toBe('hj');
  });

  it('MP → mp', () => {
    expect(mapPositionToDb('MP')).toBe('mp');
  });
});

describe('mapPositionFromDb', () => {
  it('utg → UTG', () => {
    expect(mapPositionFromDb('utg')).toBe('UTG');
  });

  it('utg1 → UTG+1', () => {
    expect(mapPositionFromDb('utg1')).toBe('UTG+1');
  });

  it('utg2 → UTG+2', () => {
    expect(mapPositionFromDb('utg2')).toBe('UTG+2');
  });

  it('btn → BTN', () => {
    expect(mapPositionFromDb('btn')).toBe('BTN');
  });

  it('sb → SB', () => {
    expect(mapPositionFromDb('sb')).toBe('SB');
  });

  it('bb → BB', () => {
    expect(mapPositionFromDb('bb')).toBe('BB');
  });

  it('mp1 → MP (lossy)', () => {
    expect(mapPositionFromDb('mp1')).toBe('MP');
  });

  it('mp2 → MP (lossy)', () => {
    expect(mapPositionFromDb('mp2')).toBe('MP');
  });

  it('co → CO', () => {
    expect(mapPositionFromDb('co')).toBe('CO');
  });

  it('hj → HJ', () => {
    expect(mapPositionFromDb('hj')).toBe('HJ');
  });
});

// ============================================================
// Result mapping logic tests
// ============================================================

function mapResultToDb(result: string): 'win' | 'loss' | 'tie' {
  if (result === 'won') return 'win';
  if (result === 'lost') return 'loss';
  if (result === 'split') return 'tie';
  return 'win';
}

function mapResultFromDb(dbResult: string): string {
  if (dbResult === 'win') return 'won';
  if (dbResult === 'loss') return 'lost';
  if (dbResult === 'tie') return 'split';
  return 'won';
}

describe('mapResultToDb', () => {
  it('won → win', () => {
    expect(mapResultToDb('won')).toBe('win');
  });

  it('lost → loss', () => {
    expect(mapResultToDb('lost')).toBe('loss');
  });

  it('split → tie', () => {
    expect(mapResultToDb('split')).toBe('tie');
  });

  it('알 수 없는 값 → win (기본값)', () => {
    expect(mapResultToDb('unknown')).toBe('win');
  });
});

describe('mapResultFromDb', () => {
  it('win → won', () => {
    expect(mapResultFromDb('win')).toBe('won');
  });

  it('loss → lost', () => {
    expect(mapResultFromDb('loss')).toBe('lost');
  });

  it('tie → split', () => {
    expect(mapResultFromDb('tie')).toBe('split');
  });

  it('알 수 없는 값 → won (기본값)', () => {
    expect(mapResultFromDb('unknown')).toBe('won');
  });
});

// ============================================================
// Action mapping logic tests
// ============================================================

function mapActionToDb(action: string): string {
  return action === 'all-in' ? 'all_in' : action;
}

function mapActionFromDb(dbAction: string): string {
  return dbAction === 'all_in' ? 'all-in' : dbAction;
}

describe('mapActionToDb', () => {
  it('all-in → all_in (하이픈을 언더스코어로)', () => {
    expect(mapActionToDb('all-in')).toBe('all_in');
  });

  it('fold → fold (변환 없음)', () => {
    expect(mapActionToDb('fold')).toBe('fold');
  });

  it('check → check', () => {
    expect(mapActionToDb('check')).toBe('check');
  });

  it('call → call', () => {
    expect(mapActionToDb('call')).toBe('call');
  });

  it('bet → bet', () => {
    expect(mapActionToDb('bet')).toBe('bet');
  });

  it('raise → raise', () => {
    expect(mapActionToDb('raise')).toBe('raise');
  });
});

describe('mapActionFromDb', () => {
  it('all_in → all-in', () => {
    expect(mapActionFromDb('all_in')).toBe('all-in');
  });

  it('fold → fold', () => {
    expect(mapActionFromDb('fold')).toBe('fold');
  });

  it('check → check', () => {
    expect(mapActionFromDb('check')).toBe('check');
  });

  it('call → call', () => {
    expect(mapActionFromDb('call')).toBe('call');
  });

  it('bet → bet', () => {
    expect(mapActionFromDb('bet')).toBe('bet');
  });

  it('raise → raise', () => {
    expect(mapActionFromDb('raise')).toBe('raise');
  });
});

// ============================================================
// Round-trip tests (position: frontend → DB → frontend)
// ============================================================

describe('Position round-trip', () => {
  const positions = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

  for (const pos of positions) {
    it(`${pos} → DB → ${pos}`, () => {
      const dbValue = mapPositionToDb(pos);
      const restored = mapPositionFromDb(dbValue);
      expect(restored).toBe(pos);
    });
  }
});

describe('Result round-trip', () => {
  const results = ['won', 'lost', 'split'];

  for (const result of results) {
    it(`${result} → DB → ${result}`, () => {
      const dbValue = mapResultToDb(result);
      const restored = mapResultFromDb(dbValue);
      expect(restored).toBe(result);
    });
  }
});

describe('Action round-trip', () => {
  const actions = ['fold', 'check', 'call', 'bet', 'raise', 'all-in'];

  for (const action of actions) {
    it(`${action} → DB → ${action}`, () => {
      const dbValue = mapActionToDb(action);
      const restored = mapActionFromDb(dbValue);
      expect(restored).toBe(action);
    });
  }
});

describe('Cards round-trip', () => {
  it('카드 배열 → 문자열 → 배열', () => {
    const cards = ['Ah', 'Kd', 'Qc'];
    const str = cardsToString(cards);
    const restored = stringToCards(str);
    expect(restored).toEqual(cards);
  });

  it('히어로 카드 round-trip', () => {
    const heroCards = ['As', 'Ks'];
    const str = cardsToString(heroCards);
    const restored = stringToCards(str);
    expect(restored).toEqual(heroCards);
  });

  it('플롭 보드 round-trip', () => {
    const flop = ['Th', '9d', '8c'];
    const str = cardsToString(flop);
    const restored = stringToCards(str);
    expect(restored).toEqual(flop);
  });
});

// ============================================================
// Card type compatibility tests
// ============================================================

describe('Card type compatibility', () => {
  it('types/poker.ts Card 형식과 CardRenderer parseCard가 호환됨', () => {
    // types/poker.ts Card = `${Rank}${Suit}` e.g. "Ah"
    const card = 'Ah'; // This is a valid Card from types/poker.ts
    const parsed = parseCard(card);
    expect(parsed).not.toBeNull();
    expect(parsed!.rank).toBe('A');
    expect(parsed!.suit).toBe('h');
  });

  it('game engine Card 형식과 CardRenderer parseCard가 호환됨', () => {
    // lib/poker/types.ts uses same template literal Card = `${Rank}${Suit}`
    const engineCard = 'Ks';
    const parsed = parseCard(engineCard);
    expect(parsed).not.toBeNull();
    expect(parsed!.rank).toBe('K');
    expect(parsed!.suit).toBe('s');
  });

  it('52장 전체 카드가 parseCard로 유효하게 파싱됨', () => {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const suits = ['h', 'd', 's', 'c'];
    let count = 0;
    for (const rank of ranks) {
      for (const suit of suits) {
        const result = parseCard(`${rank}${suit}`);
        expect(result).not.toBeNull();
        expect(result!.rank).toBe(rank);
        expect(result!.suit).toBe(suit);
        count++;
      }
    }
    expect(count).toBe(52);
  });
});
