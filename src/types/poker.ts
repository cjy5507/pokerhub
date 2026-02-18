export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K';
export type Card = `${Rank}${Suit}`;
export type Position = 'UTG' | 'UTG+1' | 'UTG+2' | 'MP' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';
export type GameType = 'cash' | 'tournament' | 'nlhe' | 'plo' | 'plo5' | 'mixed';
export type TableSize = '6max' | '9max';
export type HandResult = 'won' | 'lost' | 'split';

export interface HandAction {
  street: Street;
  sequence: number;
  position: Position;
  action: ActionType;
  amount?: number;
}

export interface HandPlayer {
  position: Position;
  stackSize: number;
  cards?: Card[];
  isHero: boolean;
}

export interface PokerHand {
  id: string;
  authorId: string;
  authorNickname?: string;
  authorLevel?: number;
  gameType: GameType;
  tableSize: TableSize;
  stakes: string;
  heroPosition: Position;
  heroCards: Card[];
  boardFlop?: Card[];
  boardTurn?: Card;
  boardRiver?: Card;
  potPreflop?: number;
  potFlop?: number;
  potTurn?: number;
  potRiver?: number;
  potFinal?: number;
  result?: HandResult;
  analysisNotes?: string;
  players: HandPlayer[];
  actions: HandAction[];
  tags?: string[];
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
}
