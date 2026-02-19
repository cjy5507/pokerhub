// Game engine types for Texas Hold'em (NLHE)
// Separate from src/types/poker.ts which is for hand history sharing

export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;

export type GameStreet = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

export type HandRankName =
  | 'Royal Flush'
  | 'Straight Flush'
  | 'Four of a Kind'
  | 'Full House'
  | 'Flush'
  | 'Straight'
  | 'Three of a Kind'
  | 'Two Pair'
  | 'One Pair'
  | 'High Card';

export interface HandRank {
  rank: number; // 9=Royal Flush, 0=High Card
  name: HandRankName;
  value: number; // Numeric value for tiebreaker comparison
  kickers: number[];
}

export interface SeatState {
  seatNumber: number;
  userId: string;
  nickname: string;
  chipStack: number;
  holeCards: Card[] | null; // null if not visible to requester
  betInRound: number;
  totalBetInHand: number;
  isFolded: boolean;
  isAllIn: boolean;
  isSittingOut: boolean;
  isActive: boolean;
}

export interface GameState {
  tableId: string;
  tableName: string;
  smallBlind: number;
  bigBlind: number;
  maxSeats: number;
  handId: string | null;
  handNumber: number;
  street: GameStreet | null;
  communityCards: Card[];
  pot: number;
  sidePots: { amount: number; eligibleSeats: number[] }[];
  currentSeat: number | null;
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  seats: (SeatState | null)[]; // index = seat number, null = empty
  lastAction: { seat: number; action: PlayerAction; amount: number } | null;
  /** Seat whose action closes the current betting round (BB option preflop, last to respond after raise) */
  actionClosedBySeat: number | null;
  /** Whether the closer has already taken a voluntary action this round */
  closerHasActed?: boolean;
  /** Seats restricted to call/fold only due to a short all-in (PokerStars rule) */
  callOnlySeats?: number[];
  turnTimeLeft: number; // seconds remaining
  turnStartedAt: string | null; // ISO timestamp for client-side timer
  status: 'waiting' | 'playing' | 'paused';
}

export interface ActionRequest {
  action: PlayerAction;
  amount?: number;
}

export interface ActionValidation {
  valid: boolean;
  error?: string;
  minBet?: number;
  maxBet?: number;
  callAmount?: number;
}

export type GameEvent =
  | { type: 'new_hand'; handNumber: number; dealerSeat: number }
  | { type: 'deal_cards'; seatNumber: number; cards: Card[] }
  | { type: 'post_blind'; seatNumber: number; amount: number; blindType: 'small' | 'big' }
  | { type: 'player_action'; seatNumber: number; action: PlayerAction; amount: number }
  | { type: 'community_cards'; street: GameStreet; cards: Card[] }
  | { type: 'showdown'; results: ShowdownResult[] }
  | { type: 'pot_awarded'; seatNumber: number; amount: number }
  | { type: 'hand_complete' };

export interface ShowdownResult {
  seatNumber: number;
  holeCards: Card[];
  handRank: HandRank;
  chipChange: number;
}
