import { describe, it, expect } from 'vitest';
import { Deck } from './deck';

describe('Deck', () => {
  it('should have 52 cards', () => {
    const deck = new Deck();
    const cards = deck.deal(52);
    expect(cards.length).toBe(52);
  });

  it('should deal unique cards', () => {
    const deck = new Deck();
    const cards = deck.deal(52);
    const unique = new Set(cards.map(c => `${c}`));
    expect(unique.size).toBe(52);
  });

  it('should track remaining cards', () => {
    const deck = new Deck();
    expect(deck.remaining()).toBe(52);
    deck.deal(5);
    expect(deck.remaining()).toBe(47);
  });

  it('should throw when dealing more than remaining', () => {
    const deck = new Deck();
    deck.deal(50);
    expect(() => deck.deal(5)).toThrow();
  });
});
