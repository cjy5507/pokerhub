import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, findBestHand, determineWinners } from './evaluator';
import type { Card } from './types';

// ── evaluate5 (via evaluateHand with 5 cards) ─────────────────────────

describe('evaluate5', () => {
  it('Royal Flush: A♠ K♠ Q♠ J♠ T♠', () => {
    const cards: Card[] = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(9);
    expect(result.name).toBe('Royal Flush');
  });

  it('Straight Flush: 9♥ 8♥ 7♥ 6♥ 5♥', () => {
    const cards: Card[] = ['9h', '8h', '7h', '6h', '5h'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(8);
    expect(result.name).toBe('Straight Flush');
    expect(result.kickers).toEqual([9]);
  });

  it('Four of a Kind: A♠ A♥ A♦ A♣ K♠', () => {
    const cards: Card[] = ['As', 'Ah', 'Ad', 'Ac', 'Ks'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(7);
    expect(result.name).toBe('Four of a Kind');
    expect(result.kickers).toEqual([14, 13]);
  });

  it('Full House: K♠ K♥ K♦ Q♠ Q♥', () => {
    const cards: Card[] = ['Ks', 'Kh', 'Kd', 'Qs', 'Qh'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(6);
    expect(result.name).toBe('Full House');
    expect(result.kickers).toEqual([13, 12]);
  });

  it('Flush: A♥ J♥ 8♥ 5♥ 3♥', () => {
    const cards: Card[] = ['Ah', 'Jh', '8h', '5h', '3h'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(5);
    expect(result.name).toBe('Flush');
    expect(result.kickers).toEqual([14, 11, 8, 5, 3]);
  });

  it('Straight: T♠ 9♥ 8♦ 7♣ 6♠', () => {
    const cards: Card[] = ['Ts', '9h', '8d', '7c', '6s'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(4);
    expect(result.name).toBe('Straight');
    expect(result.kickers).toEqual([10]);
  });

  it('Three of a Kind: 7♠ 7♥ 7♦ K♠ Q♥', () => {
    const cards: Card[] = ['7s', '7h', '7d', 'Ks', 'Qh'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(3);
    expect(result.name).toBe('Three of a Kind');
    expect(result.kickers).toEqual([7, 13, 12]);
  });

  it('Two Pair: J♠ J♥ 5♦ 5♣ A♠', () => {
    const cards: Card[] = ['Js', 'Jh', '5d', '5c', 'As'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(2);
    expect(result.name).toBe('Two Pair');
    expect(result.kickers).toEqual([11, 5, 14]);
  });

  it('One Pair: 9♠ 9♥ A♦ K♣ Q♠', () => {
    const cards: Card[] = ['9s', '9h', 'Ad', 'Kc', 'Qs'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(1);
    expect(result.name).toBe('One Pair');
    expect(result.kickers).toEqual([9, 14, 13, 12]);
  });

  it('High Card: A♠ J♥ 8♦ 5♣ 3♠', () => {
    const cards: Card[] = ['As', 'Jh', '8d', '5c', '3s'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(0);
    expect(result.name).toBe('High Card');
    expect(result.kickers).toEqual([14, 11, 8, 5, 3]);
  });

  it('Wheel Straight: A♠ 2♥ 3♦ 4♣ 5♠', () => {
    const cards: Card[] = ['As', '2h', '3d', '4c', '5s'];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(4);
    expect(result.name).toBe('Straight');
    expect(result.kickers).toEqual([5]); // 5-high straight
  });
});

// ── findBestHand ──────────────────────────────────────────────────────

describe('findBestHand', () => {
  it('7장에서 최고 핸드 선택', () => {
    // Hole: As Ks, Board: Qs Js Ts 3h 2d => Royal Flush
    const result = findBestHand(['As', 'Ks'], ['Qs', 'Js', 'Ts', '3h', '2d']);
    expect(result.rank.rank).toBe(9);
    expect(result.rank.name).toBe('Royal Flush');
  });

  it('플러시 가능하면 플러시 선택 (스트레이트보다 높을 때)', () => {
    // Hole: Ah 9h, Board: Kh 7h 2h 6s 5d
    // Flush: Ah Kh 9h 7h 2h (rank 5)
    // Straight not possible here
    const result = findBestHand(['Ah', '9h'], ['Kh', '7h', '2h', '6s', '5d']);
    expect(result.rank.rank).toBe(5);
    expect(result.rank.name).toBe('Flush');
  });

  it('풀하우스 > 플러시', () => {
    // Hole: Kh Kd, Board: Ks 9h 9d 2h 3h
    // Full House: KKK 99 (rank 6) beats any flush
    const result = findBestHand(['Kh', 'Kd'], ['Ks', '9h', '9d', '2h', '3h']);
    expect(result.rank.rank).toBe(6);
    expect(result.rank.name).toBe('Full House');
  });
});

// ── determineWinners ──────────────────────────────────────────────────

describe('determineWinners', () => {
  it('단독 승자', () => {
    const players = [
      { seatNumber: 1, holeCards: ['As', 'Ks'] as Card[] },
      { seatNumber: 2, holeCards: ['7d', '2c'] as Card[] },
    ];
    const community: Card[] = ['Qs', 'Js', 'Ts', '3h', '4d'];
    // Seat 1: Royal Flush, Seat 2: High card
    const winners = determineWinners(players, community);
    expect(winners).toHaveLength(1);
    expect(winners[0].seatNumber).toBe(1);
    expect(winners[0].rank.name).toBe('Royal Flush');
  });

  it('동점: 2명 승자', () => {
    // Both players have same hole cards (different suits), board makes the hand
    const players = [
      { seatNumber: 1, holeCards: ['2d', '3c'] as Card[] },
      { seatNumber: 2, holeCards: ['2c', '3d'] as Card[] },
    ];
    // Board: As Ks Qs Js Ts => Royal Flush on board, both play the board
    const community: Card[] = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
    const winners = determineWinners(players, community);
    expect(winners).toHaveLength(2);
    expect(winners.map((w) => w.seatNumber).sort()).toEqual([1, 2]);
  });

  it('키커로 승부: 같은 페어 다른 키커', () => {
    const players = [
      { seatNumber: 1, holeCards: ['Ah', '9s'] as Card[] }, // Pair of 9s, kicker A
      { seatNumber: 2, holeCards: ['7d', '9c'] as Card[] }, // Pair of 9s, kicker 7
    ];
    const community: Card[] = ['9h', '5d', '3c', '2s', '4h'];
    const winners = determineWinners(players, community);
    expect(winners).toHaveLength(1);
    expect(winners[0].seatNumber).toBe(1); // Ace kicker wins
  });
});

// ── hand ranking order ────────────────────────────────────────────────

describe('hand ranking order', () => {
  const royalFlush: Card[] = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
  const straightFlush: Card[] = ['9h', '8h', '7h', '6h', '5h'];
  const fourOfAKind: Card[] = ['As', 'Ah', 'Ad', 'Ac', 'Ks'];
  const fullHouse: Card[] = ['Ks', 'Kh', 'Kd', 'Qs', 'Qh'];
  const flush: Card[] = ['Ah', 'Jh', '8h', '5h', '3h'];
  const straight: Card[] = ['Ts', '9h', '8d', '7c', '6s'];
  const threeOfAKind: Card[] = ['7s', '7h', '7d', 'Ks', 'Qh'];
  const twoPair: Card[] = ['Js', 'Jh', '5d', '5c', 'As'];
  const onePair: Card[] = ['9s', '9h', 'Ad', 'Kc', 'Qs'];
  const highCard: Card[] = ['As', 'Jh', '8d', '5c', '3s'];

  it('Royal Flush > Straight Flush', () => {
    expect(compareHands(royalFlush, straightFlush)).toBe(1);
  });

  it('Four of a Kind > Full House', () => {
    expect(compareHands(fourOfAKind, fullHouse)).toBe(1);
  });

  it('Full House > Flush', () => {
    expect(compareHands(fullHouse, flush)).toBe(1);
  });

  it('Flush > Straight', () => {
    expect(compareHands(flush, straight)).toBe(1);
  });

  it('Straight > Three of a Kind', () => {
    expect(compareHands(straight, threeOfAKind)).toBe(1);
  });

  it('Three of a Kind > Two Pair', () => {
    expect(compareHands(threeOfAKind, twoPair)).toBe(1);
  });

  it('Two Pair > One Pair', () => {
    expect(compareHands(twoPair, onePair)).toBe(1);
  });

  it('One Pair > High Card', () => {
    expect(compareHands(onePair, highCard)).toBe(1);
  });
});
