import { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['h', 'd', 'c', 's'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

export class Deck {
  private cards: Card[] = [];
  private index: number = 0;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push(`${rank}${suit}` as Card);
      }
    }
    this.index = 0;
    this.shuffle();
  }

  shuffle(): void {
    // Fisher-Yates shuffle
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    this.index = 0;
  }

  deal(count: number = 1): Card[] {
    if (this.index + count > this.cards.length) {
      throw new Error(`Cannot deal ${count} cards, only ${this.remaining()} remaining`);
    }
    const dealt = this.cards.slice(this.index, this.index + count);
    this.index += count;
    return dealt;
  }

  remaining(): number {
    return this.cards.length - this.index;
  }
}

export { SUITS, RANKS };
