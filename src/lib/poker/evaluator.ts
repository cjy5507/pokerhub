import { Card, HandRank, HandRankName, Rank, Suit } from './types';

// ── Rank/Suit conversion ────────────────────────────────────────────

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const SUIT_VALUES: Record<Suit, number> = { 'h': 0, 'd': 1, 'c': 2, 's': 3 };

interface ParsedCard {
  rank: number;
  suit: number;
  original: Card;
}

function parseCard(card: Card): ParsedCard {
  const rank = card[0] as Rank;
  const suit = card[1] as Suit;
  return { rank: RANK_VALUES[rank], suit: SUIT_VALUES[suit], original: card };
}

// ── Combination generation ──────────────────────────────────────────

/** Generate all C(n,5) combinations of indices */
function combinations5(n: number): number[][] {
  const result: number[][] = [];
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            result.push([a, b, c, d, e]);
          }
        }
      }
    }
  }
  return result;
}

// ── 5-card hand evaluation ──────────────────────────────────────────

/**
 * Evaluate exactly 5 cards and return a HandRank.
 * The `value` field encodes the hand in a way that higher is always better,
 * allowing direct numeric comparison between any two hands.
 *
 * Encoding: rank * 10^10 + primary * 10^8 + k1 * 10^6 + k2 * 10^4 + k3 * 10^2 + k4
 * where rank is 0-9, primary distinguishes within rank, and k1-k4 are kickers.
 */
function evaluate5(cards: ParsedCard[]): HandRank {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);

  // Count occurrences of each rank
  const rankCounts = new Map<number, number>();
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) || 0) + 1);
  }

  // Sort groups: by count desc, then rank desc
  const groups = Array.from(rankCounts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]; // higher count first
    return b[0] - a[0]; // higher rank first
  });

  const isFlush = suits.every((s) => s === suits[0]);

  // Check for straight (including A-2-3-4-5 wheel)
  let isStraight = false;
  let straightHigh = 0;

  const uniqueRanks = Array.from(new Set(ranks)).sort((a, b) => b - a);
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    }
    // Wheel: A-2-3-4-5
    if (
      uniqueRanks[0] === 14 &&
      uniqueRanks[1] === 5 &&
      uniqueRanks[2] === 4 &&
      uniqueRanks[3] === 3 &&
      uniqueRanks[4] === 2
    ) {
      isStraight = true;
      straightHigh = 5; // 5-high straight
    }
  }

  // ── Classify hand ─────────────────────────────────────────────

  let handRankNum: number;
  let name: HandRankName;
  let kickers: number[];

  if (isStraight && isFlush && straightHigh === 14) {
    // Royal Flush
    handRankNum = 9;
    name = 'Royal Flush';
    kickers = [14];
  } else if (isStraight && isFlush) {
    // Straight Flush
    handRankNum = 8;
    name = 'Straight Flush';
    kickers = [straightHigh];
  } else if (groups[0][1] === 4) {
    // Four of a Kind
    handRankNum = 7;
    name = 'Four of a Kind';
    kickers = [groups[0][0], groups[1][0]];
  } else if (groups[0][1] === 3 && groups[1][1] === 2) {
    // Full House
    handRankNum = 6;
    name = 'Full House';
    kickers = [groups[0][0], groups[1][0]];
  } else if (isFlush) {
    // Flush
    handRankNum = 5;
    name = 'Flush';
    kickers = ranks.slice(0, 5);
  } else if (isStraight) {
    // Straight
    handRankNum = 4;
    name = 'Straight';
    kickers = [straightHigh];
  } else if (groups[0][1] === 3) {
    // Three of a Kind
    handRankNum = 3;
    name = 'Three of a Kind';
    const remaining = ranks.filter((r) => r !== groups[0][0]).slice(0, 2);
    kickers = [groups[0][0], ...remaining];
  } else if (groups[0][1] === 2 && groups[1][1] === 2) {
    // Two Pair
    handRankNum = 2;
    name = 'Two Pair';
    const highPair = Math.max(groups[0][0], groups[1][0]);
    const lowPair = Math.min(groups[0][0], groups[1][0]);
    const kicker = ranks.find((r) => r !== highPair && r !== lowPair)!;
    kickers = [highPair, lowPair, kicker];
  } else if (groups[0][1] === 2) {
    // One Pair
    handRankNum = 1;
    name = 'One Pair';
    const remaining = ranks.filter((r) => r !== groups[0][0]).slice(0, 3);
    kickers = [groups[0][0], ...remaining];
  } else {
    // High Card
    handRankNum = 0;
    name = 'High Card';
    kickers = ranks.slice(0, 5);
  }

  // ── Compute a single comparable value ─────────────────────────
  // We use a base-15 style encoding so each kicker position is distinct.
  // rank * 15^5 + k[0]*15^4 + k[1]*15^3 + k[2]*15^2 + k[3]*15 + k[4]
  const paddedKickers = [...kickers];
  while (paddedKickers.length < 5) paddedKickers.push(0);

  const value =
    handRankNum * 15 ** 5 +
    paddedKickers[0] * 15 ** 4 +
    paddedKickers[1] * 15 ** 3 +
    paddedKickers[2] * 15 ** 2 +
    paddedKickers[3] * 15 +
    paddedKickers[4];

  return { rank: handRankNum, name, value, kickers };
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Evaluate the best 5-card hand from 5, 6, or 7 cards.
 */
export function evaluateHand(cards: Card[]): HandRank {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`evaluateHand requires 5-7 cards, got ${cards.length}`);
  }

  const parsed = cards.map(parseCard);

  if (parsed.length === 5) {
    return evaluate5(parsed);
  }

  // For 6 or 7 cards, try all C(n,5) combinations
  const combos = combinations5(parsed.length);
  let bestRank: HandRank | null = null;

  for (const combo of combos) {
    const hand = combo.map((i) => parsed[i]);
    const rank = evaluate5(hand);
    if (bestRank === null || rank.value > bestRank.value) {
      bestRank = rank;
    }
  }

  return bestRank!;
}

/**
 * Compare two sets of cards (each 5-7 cards).
 * Returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie.
 */
export function compareHands(hand1: Card[], hand2: Card[]): -1 | 0 | 1 {
  const rank1 = evaluateHand(hand1);
  const rank2 = evaluateHand(hand2);

  if (rank1.value > rank2.value) return 1;
  if (rank1.value < rank2.value) return -1;
  return 0;
}

/**
 * Find the best 5-card hand from hole cards + community cards.
 * Returns the best combination and its rank.
 */
export function findBestHand(
  holeCards: Card[],
  communityCards: Card[]
): { cards: Card[]; rank: HandRank } {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5 || allCards.length > 7) {
    throw new Error(`findBestHand requires 5-7 total cards, got ${allCards.length}`);
  }

  const parsed = allCards.map(parseCard);

  if (parsed.length === 5) {
    const rank = evaluate5(parsed);
    return { cards: allCards, rank };
  }

  const combos = combinations5(parsed.length);
  let bestRank: HandRank | null = null;
  let bestCombo: number[] = combos[0];

  for (const combo of combos) {
    const hand = combo.map((i) => parsed[i]);
    const rank = evaluate5(hand);
    if (bestRank === null || rank.value > bestRank.value) {
      bestRank = rank;
      bestCombo = combo;
    }
  }

  const bestCards = bestCombo.map((i) => allCards[i]);
  return { cards: bestCards, rank: bestRank! };
}

/**
 * Determine the winner(s) from a list of players with hole cards and shared community cards.
 * Returns an array of winners (multiple if split pot).
 */
export function determineWinners(
  players: { seatNumber: number; holeCards: Card[] }[],
  communityCards: Card[]
): { seatNumber: number; rank: HandRank }[] {
  if (players.length === 0) return [];

  const evaluated = players.map((p) => {
    const { rank } = findBestHand(p.holeCards, communityCards);
    return { seatNumber: p.seatNumber, rank };
  });

  // Find the maximum hand value
  const maxValue = Math.max(...evaluated.map((e) => e.rank.value));

  // Return all players tied at the maximum value
  return evaluated.filter((e) => e.rank.value === maxValue);
}
