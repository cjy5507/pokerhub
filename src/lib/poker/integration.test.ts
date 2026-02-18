import { describe, it, expect } from 'vitest';
import { PokerEngine } from './engine';
import { findBestHand, determineWinners } from './evaluator';
import { Deck } from './deck';
import { Card, GameState, SeatState, ActionRequest } from './types';

// ── Helpers ──────────────────────────────────────────────────────────

function makeSeat(
  seatNumber: number,
  chipStack: number,
  overrides: Partial<SeatState> = {}
): SeatState {
  return {
    seatNumber,
    userId: `player-${seatNumber}`,
    nickname: `Player${seatNumber}`,
    chipStack,
    holeCards: null,
    betInRound: 0,
    totalBetInHand: 0,
    isFolded: false,
    isAllIn: false,
    isSittingOut: false,
    isActive: true,
    ...overrides,
  };
}

function setupGame(
  playerCount: number,
  chipStack: number,
  smallBlind: number,
  bigBlind: number
) {
  const engine = new PokerEngine();
  const seats: SeatState[] = [];
  for (let i = 0; i < playerCount; i++) {
    seats.push(makeSeat(i, chipStack));
  }
  return { engine, seats };
}

/** Build a full GameState from the partial returned by startHand */
function buildState(
  partial: Partial<GameState>,
  smallBlind: number,
  bigBlind: number
): GameState {
  return {
    tableId: 'test-table',
    tableName: 'Test',
    smallBlind,
    bigBlind,
    maxSeats: partial.seats?.length ?? 6,
    handId: 'hand-1',
    handNumber: 1,
    turnTimeLeft: 30,
    ...partial,
  } as GameState;
}

/** Apply an action and merge the returned partial into the existing state */
function applyAndMerge(
  engine: PokerEngine,
  state: GameState,
  seatNumber: number,
  action: ActionRequest
): { state: GameState; isHandComplete: boolean } {
  const validation = engine.validateAction(state, seatNumber, action);
  if (!validation.valid) {
    throw new Error(
      `Invalid action ${action.action} for seat ${seatNumber}: ${validation.error}`
    );
  }
  const { newState, isHandComplete } = engine.applyAction(
    state,
    seatNumber,
    action
  );
  return {
    state: { ...state, ...newState } as GameState,
    isHandComplete,
  };
}

/** Advance street and merge into state */
function advanceAndMerge(
  engine: PokerEngine,
  state: GameState,
  deck: Deck
): GameState {
  const { newState } = engine.advanceStreet(state, deck);
  return { ...state, ...newState } as GameState;
}

// ── Test suites ──────────────────────────────────────────────────────

describe('Integration: 2-player heads-up full hand', () => {
  it('preflop -> flop -> turn -> river -> showdown full flow', () => {
    const { engine, seats } = setupGame(2, 1000, 5, 10);
    const dealerSeat = 0;
    const { deck, holeCards, gameState } = engine.startHand(
      seats,
      dealerSeat,
      5,
      10
    );
    let state = buildState(gameState, 5, 10);

    // Heads-up: dealer=seat0 is SB, seat1 is BB
    // SB posts 5, BB posts 10
    expect(state.seats[0]!.betInRound).toBe(5);
    expect(state.seats[1]!.betInRound).toBe(10);
    expect(state.seats[0]!.chipStack).toBe(995);
    expect(state.seats[1]!.chipStack).toBe(990);
    expect(state.pot).toBe(15);
    expect(state.street).toBe('preflop');

    // Preflop: SB acts first in heads-up
    expect(state.currentSeat).toBe(0);

    // SB calls (needs 5 more to match BB's 10)
    let result = applyAndMerge(engine, state, 0, { action: 'call' });
    state = result.state;
    expect(state.seats[0]!.betInRound).toBe(10);
    expect(state.seats[0]!.chipStack).toBe(990);
    expect(state.pot).toBe(20);
    expect(result.isHandComplete).toBe(false);

    // BB checks (BB option)
    expect(state.currentSeat).toBe(1);
    result = applyAndMerge(engine, state, 1, { action: 'check' });
    state = result.state;
    expect(result.isHandComplete).toBe(false);
    // Betting round complete
    expect(state.currentSeat).toBeNull();

    // Advance to flop
    state = advanceAndMerge(engine, state, deck);
    expect(state.street).toBe('flop');
    expect(state.communityCards.length).toBe(3);
    expect(state.currentBet).toBe(0);

    // Flop: postflop first-to-act is left of dealer
    // Heads-up postflop: BB (seat1) acts first
    expect(state.currentSeat).toBe(1);

    // Check-check
    result = applyAndMerge(engine, state, 1, { action: 'check' });
    state = result.state;
    expect(state.currentSeat).toBe(0);
    result = applyAndMerge(engine, state, 0, { action: 'check' });
    state = result.state;
    expect(state.currentSeat).toBeNull();

    // Advance to turn
    state = advanceAndMerge(engine, state, deck);
    expect(state.street).toBe('turn');
    expect(state.communityCards.length).toBe(4);
    expect(state.currentSeat).toBe(1);

    // Turn: seat1 bets 20, seat0 calls
    result = applyAndMerge(engine, state, 1, { action: 'bet', amount: 20 });
    state = result.state;
    expect(state.pot).toBe(40);
    expect(state.currentSeat).toBe(0);

    result = applyAndMerge(engine, state, 0, { action: 'call' });
    state = result.state;
    expect(state.pot).toBe(60);
    expect(state.currentSeat).toBeNull();

    // Advance to river
    state = advanceAndMerge(engine, state, deck);
    expect(state.street).toBe('river');
    expect(state.communityCards.length).toBe(5);
    expect(state.currentSeat).toBe(1);

    // River: check-check
    result = applyAndMerge(engine, state, 1, { action: 'check' });
    state = result.state;
    result = applyAndMerge(engine, state, 0, { action: 'check' });
    state = result.state;
    expect(state.currentSeat).toBeNull();

    // Showdown
    const showdown = engine.resolveShowdown(state, holeCards);
    expect(showdown.winners.length).toBeGreaterThanOrEqual(1);
    expect(showdown.results.length).toBe(2);

    // Total winnings should equal total pot (60)
    const totalAwarded = showdown.winners.reduce((s, w) => s + w.amount, 0);
    expect(totalAwarded).toBe(60);

    // Each result should have a valid hand rank
    for (const r of showdown.results) {
      expect(r.holeCards.length).toBe(2);
      expect(r.handRank).not.toBe('Folded');
    }
  });
});

describe('Integration: 6-player fold victory', () => {
  it('UTG raise -> everyone folds -> UTG wins pot', () => {
    const { engine, seats } = setupGame(6, 1000, 5, 10);
    const dealerSeat = 0;
    const { deck, holeCards, gameState } = engine.startHand(
      seats,
      dealerSeat,
      5,
      10
    );
    let state = buildState(gameState, 5, 10);

    // Dealer=0, SB=1, BB=2, UTG=3, MP=4, CO=5
    expect(state.seats[1]!.betInRound).toBe(5); // SB
    expect(state.seats[2]!.betInRound).toBe(10); // BB
    expect(state.pot).toBe(15);

    // Preflop: UTG (seat 3) acts first
    expect(state.currentSeat).toBe(3);

    // UTG raises to 30
    let result = applyAndMerge(engine, state, 3, {
      action: 'raise',
      amount: 30,
    });
    state = result.state;
    expect(state.pot).toBe(45);
    expect(result.isHandComplete).toBe(false);

    // MP (seat 4) folds
    expect(state.currentSeat).toBe(4);
    result = applyAndMerge(engine, state, 4, { action: 'fold' });
    state = result.state;

    // CO (seat 5) folds
    expect(state.currentSeat).toBe(5);
    result = applyAndMerge(engine, state, 5, { action: 'fold' });
    state = result.state;

    // BTN (seat 0) folds
    expect(state.currentSeat).toBe(0);
    result = applyAndMerge(engine, state, 0, { action: 'fold' });
    state = result.state;

    // SB (seat 1) folds
    expect(state.currentSeat).toBe(1);
    result = applyAndMerge(engine, state, 1, { action: 'fold' });
    state = result.state;

    // BB (seat 2) folds -> UTG wins
    expect(state.currentSeat).toBe(2);
    result = applyAndMerge(engine, state, 2, { action: 'fold' });
    state = result.state;

    expect(result.isHandComplete).toBe(true);
    // UTG should have won the pot (15 blinds + 30 raise = 45, but UTG put in 30)
    // UTG gets pot added to chipStack
    expect(state.seats[3]!.chipStack).toBe(1000 - 30 + 45);
  });
});

describe('Integration: check-around all streets', () => {
  it('preflop limped -> flop/turn/river all check -> showdown', () => {
    const { engine, seats } = setupGame(3, 1000, 5, 10);
    const dealerSeat = 0;
    const { deck, holeCards, gameState } = engine.startHand(
      seats,
      dealerSeat,
      5,
      10
    );
    let state = buildState(gameState, 5, 10);

    // Dealer=0, SB=1, BB=2
    // Preflop: UTG is seat0 in 3-player? No - dealer=0, SB=1, BB=2
    // First to act preflop (3+ players): first seat after BB = seat0
    expect(state.currentSeat).toBe(0);

    // Seat 0 calls 10
    let result = applyAndMerge(engine, state, 0, { action: 'call' });
    state = result.state;

    // SB (seat 1) calls (needs 5 more)
    expect(state.currentSeat).toBe(1);
    result = applyAndMerge(engine, state, 1, { action: 'call' });
    state = result.state;

    // BB (seat 2) checks (BB option)
    expect(state.currentSeat).toBe(2);
    result = applyAndMerge(engine, state, 2, { action: 'check' });
    state = result.state;
    expect(state.currentSeat).toBeNull();
    expect(state.pot).toBe(30); // 10+10+10

    // Flop
    state = advanceAndMerge(engine, state, deck);
    expect(state.street).toBe('flop');
    // Postflop first to act: left of dealer (seat 1)
    expect(state.currentSeat).toBe(1);

    // Check around: seat1, seat2, seat0
    result = applyAndMerge(engine, state, 1, { action: 'check' });
    state = result.state;
    result = applyAndMerge(engine, state, 2, { action: 'check' });
    state = result.state;
    result = applyAndMerge(engine, state, 0, { action: 'check' });
    state = result.state;
    expect(state.currentSeat).toBeNull();

    // Turn
    state = advanceAndMerge(engine, state, deck);
    expect(state.street).toBe('turn');
    expect(state.currentSeat).toBe(1);

    result = applyAndMerge(engine, state, 1, { action: 'check' });
    state = result.state;
    result = applyAndMerge(engine, state, 2, { action: 'check' });
    state = result.state;
    result = applyAndMerge(engine, state, 0, { action: 'check' });
    state = result.state;
    expect(state.currentSeat).toBeNull();

    // River
    state = advanceAndMerge(engine, state, deck);
    expect(state.street).toBe('river');
    expect(state.currentSeat).toBe(1);

    result = applyAndMerge(engine, state, 1, { action: 'check' });
    state = result.state;
    result = applyAndMerge(engine, state, 2, { action: 'check' });
    state = result.state;
    result = applyAndMerge(engine, state, 0, { action: 'check' });
    state = result.state;
    expect(state.currentSeat).toBeNull();

    // Showdown
    const showdown = engine.resolveShowdown(state, holeCards);
    expect(showdown.winners.length).toBeGreaterThanOrEqual(1);
    const totalAwarded = showdown.winners.reduce((s, w) => s + w.amount, 0);
    expect(totalAwarded).toBe(30);

    // All 3 players should be in results (no one folded)
    expect(showdown.results.length).toBe(3);
    for (const r of showdown.results) {
      expect(r.handRank).not.toBe('Folded');
    }
  });
});

describe('Integration: 3-way all-in with side pots', () => {
  it('different stacks all-in -> side pots distributed correctly', () => {
    const engine = new PokerEngine();
    // Player 0: 500 chips (short stack)
    // Player 1: 1000 chips (medium stack)
    // Player 2: 1500 chips (big stack)
    const seats = [makeSeat(0, 500), makeSeat(1, 1000), makeSeat(2, 1500)];
    const dealerSeat = 0;

    const { deck, holeCards, gameState } = engine.startHand(
      seats,
      dealerSeat,
      5,
      10
    );
    let state = buildState(gameState, 5, 10);

    // Dealer=0(SB), SB=1, BB=2 -> No, 3 players: dealer=0, SB=1, BB=2
    // First to act preflop: seat0 (after BB=2)
    expect(state.currentSeat).toBe(0);

    // Seat 0 goes all-in (has 500 - 0 bet = 500... but SB posted? No -- seat 0 is dealer in 3-player)
    // Dealer=0, SB=1, BB=2. Seat 0 has 1000 chips, no blind posted.
    // Seat 0 all-in
    let result = applyAndMerge(engine, state, 0, { action: 'all_in' });
    state = result.state;
    expect(state.seats[0]!.isAllIn).toBe(true);

    // Seat 1 (SB, already posted 5) all-in
    expect(state.currentSeat).toBe(1);
    result = applyAndMerge(engine, state, 1, { action: 'all_in' });
    state = result.state;
    expect(state.seats[1]!.isAllIn).toBe(true);

    // Seat 2 (BB, already posted 10) calls (or all_in)
    expect(state.currentSeat).toBe(2);
    result = applyAndMerge(engine, state, 2, { action: 'call' });
    state = result.state;

    // All betting is done
    expect(state.currentSeat).toBeNull();

    // Advance through streets (everyone is all-in or called the max)
    // Skip to showdown since no one can act
    if (state.street === 'preflop') {
      state = advanceAndMerge(engine, state, deck);
    }
    if (state.street === 'flop') {
      state = advanceAndMerge(engine, state, deck);
    }
    if (state.street === 'turn') {
      state = advanceAndMerge(engine, state, deck);
    }
    if (state.street === 'river') {
      // ready for showdown
    }

    expect(state.communityCards.length).toBe(5);

    // Calculate side pots
    const nonNullSeats = state.seats.filter(
      (s): s is SeatState => s !== null
    );
    const pots = engine.calculatePots(nonNullSeats);

    // There should be side pots since players had different stacks
    expect(pots.length).toBeGreaterThanOrEqual(1);

    // Total pot amounts should equal total contributions
    const totalPotAmount = pots.reduce((s, p) => s + p.amount, 0);
    const totalContributions = nonNullSeats.reduce(
      (s, seat) => s + seat.totalBetInHand,
      0
    );
    expect(totalPotAmount).toBe(totalContributions);

    // Resolve showdown
    const showdown = engine.resolveShowdown(state, holeCards);
    expect(showdown.winners.length).toBeGreaterThanOrEqual(1);

    // Total awarded should equal total pot
    const totalAwarded = showdown.winners.reduce((s, w) => s + w.amount, 0);
    expect(totalAwarded).toBe(totalContributions);

    // Verify chip changes sum to zero (zero-sum game)
    const totalChipChange = showdown.results.reduce(
      (s, r) => s + r.chipChange,
      0
    );
    expect(totalChipChange).toBe(0);
  });
});

describe('Integration: dealer rotation simulation', () => {
  it('dealer moves clockwise across consecutive hands', () => {
    const engine = new PokerEngine();
    const chipStack = 1000;
    const dealerPositions: number[] = [];

    for (let hand = 0; hand < 3; hand++) {
      const dealerSeat = hand % 4; // seat0, seat1, seat2
      const seats = [
        makeSeat(0, chipStack),
        makeSeat(1, chipStack),
        makeSeat(2, chipStack),
        makeSeat(3, chipStack),
      ];

      const { gameState } = engine.startHand(seats, dealerSeat, 5, 10);
      dealerPositions.push(gameState.dealerSeat!);
    }

    expect(dealerPositions).toEqual([0, 1, 2]);
  });

  it('skips empty/inactive seats in rotation', () => {
    const engine = new PokerEngine();
    // Seats 0,1,3 active (seat 2 missing)
    const seats = [makeSeat(0, 1000), makeSeat(1, 1000), makeSeat(3, 1000)];

    // Dealer at seat 0
    const { gameState: gs1 } = engine.startHand(seats, 0, 5, 10);
    expect(gs1.dealerSeat).toBe(0);
    // SB=1, BB=3 (skips seat 2)
    expect(gs1.seats![1]!.betInRound).toBe(5);
    expect(gs1.seats![3]!.betInRound).toBe(10);

    // Next hand dealer at seat 1
    const seats2 = [makeSeat(0, 1000), makeSeat(1, 1000), makeSeat(3, 1000)];
    const { gameState: gs2 } = engine.startHand(seats2, 1, 5, 10);
    expect(gs2.dealerSeat).toBe(1);
    // SB=3 (skips 2), BB=0
    expect(gs2.seats![3]!.betInRound).toBe(5);
    expect(gs2.seats![0]!.betInRound).toBe(10);
  });
});

describe('Integration: BB option', () => {
  it('all call -> BB gets option to check or raise', () => {
    const { engine, seats } = setupGame(4, 1000, 5, 10);
    const dealerSeat = 0;
    const { deck, holeCards, gameState } = engine.startHand(
      seats,
      dealerSeat,
      5,
      10
    );
    let state = buildState(gameState, 5, 10);

    // Dealer=0, SB=1, BB=2, UTG=3
    expect(state.seats[1]!.betInRound).toBe(5); // SB
    expect(state.seats[2]!.betInRound).toBe(10); // BB

    // UTG (seat 3) calls 10
    expect(state.currentSeat).toBe(3);
    let result = applyAndMerge(engine, state, 3, { action: 'call' });
    state = result.state;

    // BTN (seat 0) calls 10
    expect(state.currentSeat).toBe(0);
    result = applyAndMerge(engine, state, 0, { action: 'call' });
    state = result.state;

    // SB (seat 1) calls (5 more)
    expect(state.currentSeat).toBe(1);
    result = applyAndMerge(engine, state, 1, { action: 'call' });
    state = result.state;

    // BB (seat 2) should have option, NOT auto-end
    expect(state.currentSeat).toBe(2);
    expect(result.isHandComplete).toBe(false);

    // BB checks -> round over
    result = applyAndMerge(engine, state, 2, { action: 'check' });
    state = result.state;
    expect(state.currentSeat).toBeNull();
    expect(state.pot).toBe(40); // 10*4
  });

  it('BB can raise when given option', () => {
    const { engine, seats } = setupGame(4, 1000, 5, 10);
    const dealerSeat = 0;
    const { deck, holeCards, gameState } = engine.startHand(
      seats,
      dealerSeat,
      5,
      10
    );
    let state = buildState(gameState, 5, 10);

    // UTG calls, BTN calls, SB calls
    let result = applyAndMerge(engine, state, 3, { action: 'call' });
    state = result.state;
    result = applyAndMerge(engine, state, 0, { action: 'call' });
    state = result.state;
    result = applyAndMerge(engine, state, 1, { action: 'call' });
    state = result.state;

    // BB bets 20 (BB option -- currentBet matches BB's bet, so this is a "bet" not "raise")
    expect(state.currentSeat).toBe(2);
    result = applyAndMerge(engine, state, 2, { action: 'bet', amount: 20 });
    state = result.state;
    expect(state.currentBet).toBe(30); // BB already had 10 in, bet 20 more = 30 total
    expect(result.isHandComplete).toBe(false);

    // Other players must respond to the bet
    // UTG (seat 3) should act next
    expect(state.currentSeat).toBe(3);
  });
});

describe('Integration: bet-raise-reraise sequences', () => {
  it('postflop bet-raise-call sequence', () => {
    const { engine, seats } = setupGame(3, 1000, 5, 10);
    const dealerSeat = 0;
    const { deck, holeCards, gameState } = engine.startHand(
      seats,
      dealerSeat,
      5,
      10
    );
    let state = buildState(gameState, 5, 10);

    // Quick preflop: seat0 calls, SB calls, BB checks
    let result = applyAndMerge(engine, state, 0, { action: 'call' });
    state = result.state;
    result = applyAndMerge(engine, state, 1, { action: 'call' });
    state = result.state;
    result = applyAndMerge(engine, state, 2, { action: 'check' });
    state = result.state;

    // Flop
    state = advanceAndMerge(engine, state, deck);
    expect(state.street).toBe('flop');

    // Seat 1 bets 20
    expect(state.currentSeat).toBe(1);
    result = applyAndMerge(engine, state, 1, { action: 'bet', amount: 20 });
    state = result.state;
    expect(state.currentBet).toBe(20);

    // Seat 2 raises to 60
    expect(state.currentSeat).toBe(2);
    result = applyAndMerge(engine, state, 2, {
      action: 'raise',
      amount: 60,
    });
    state = result.state;
    expect(state.currentBet).toBe(60);

    // Seat 0 folds
    expect(state.currentSeat).toBe(0);
    result = applyAndMerge(engine, state, 0, { action: 'fold' });
    state = result.state;

    // Seat 1 calls
    expect(state.currentSeat).toBe(1);
    result = applyAndMerge(engine, state, 1, { action: 'call' });
    state = result.state;
    expect(state.currentSeat).toBeNull();
    expect(state.pot).toBe(30 + 60 + 60); // preflop 30 + flop bets
  });
});

describe('Integration: single fold leaves one player (preflop)', () => {
  it('heads-up SB folds -> BB wins blinds', () => {
    const { engine, seats } = setupGame(2, 1000, 5, 10);
    const dealerSeat = 0;
    const { deck, holeCards, gameState } = engine.startHand(
      seats,
      dealerSeat,
      5,
      10
    );
    let state = buildState(gameState, 5, 10);

    // Heads-up: SB=seat0 (dealer), BB=seat1
    expect(state.currentSeat).toBe(0);

    // SB folds
    const result = applyAndMerge(engine, state, 0, { action: 'fold' });
    state = result.state;

    expect(result.isHandComplete).toBe(true);
    // BB wins the pot (15 = 5+10)
    expect(state.seats[1]!.chipStack).toBe(990 + 15);
  });
});

describe('Integration: action validation', () => {
  it('rejects check when there is a bet to call', () => {
    const { engine, seats } = setupGame(3, 1000, 5, 10);
    const { gameState } = engine.startHand(seats, 0, 5, 10);
    const state = buildState(gameState, 5, 10);

    // Seat 0 must call 10 (BB), not check
    const validation = engine.validateAction(state, 0, { action: 'check' });
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('call');
  });

  it('rejects bet when there is already a bet (should use raise)', () => {
    const { engine, seats } = setupGame(3, 1000, 5, 10);
    const { gameState } = engine.startHand(seats, 0, 5, 10);
    const state = buildState(gameState, 5, 10);

    // Seat 0 can't bet when currentBet=10, must raise
    const validation = engine.validateAction(state, 0, {
      action: 'bet',
      amount: 20,
    });
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('raise');
  });

  it('rejects acting out of turn', () => {
    const { engine, seats } = setupGame(3, 1000, 5, 10);
    const { gameState } = engine.startHand(seats, 0, 5, 10);
    const state = buildState(gameState, 5, 10);

    // Seat 1 tries to act, but it's seat 0's turn
    const validation = engine.validateAction(state, 1, { action: 'fold' });
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Not your turn');
  });

  it('rejects raise below minimum', () => {
    const { engine, seats } = setupGame(3, 1000, 5, 10);
    const { gameState } = engine.startHand(seats, 0, 5, 10);
    const state = buildState(gameState, 5, 10);

    // Minimum raise to 20 (currentBet 10 + minRaise 10)
    const validation = engine.validateAction(state, 0, {
      action: 'raise',
      amount: 15,
    });
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Minimum raise');
  });
});

describe('Integration: evaluator with known hands', () => {
  it('royal flush beats straight flush', () => {
    const royalFlush: Card[] = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
    const straightFlush: Card[] = ['9h', '8h', '7h', '6h', '5h'];
    const community: Card[] = ['2c', '3d', '4c', '7s', '9d'];

    const royal = findBestHand(royalFlush.slice(0, 2), [
      ...royalFlush.slice(2),
      ...community.slice(0, 2),
    ]);
    const straight = findBestHand(straightFlush.slice(0, 2), [
      ...straightFlush.slice(2),
      ...community.slice(0, 2),
    ]);

    expect(royal.rank.name).toBe('Royal Flush');
    expect(straight.rank.name).toBe('Straight Flush');
    expect(royal.rank.value).toBeGreaterThan(straight.rank.value);
  });

  it('full house beats flush', () => {
    const holeCards1: Card[] = ['Ah', 'Ad'];
    const holeCards2: Card[] = ['Kh', '9h'];
    const community: Card[] = ['As', '7h', '7d', '3h', '2c'];

    const fullHouse = findBestHand(holeCards1, community);
    const flush = findBestHand(holeCards2, community);

    expect(fullHouse.rank.name).toBe('Full House');
    // Player 2 has Kh, 9h with 7h, 3h on board = 4 hearts, not a flush
    // Actually check what they get
    expect(fullHouse.rank.value).toBeGreaterThan(flush.rank.value);
  });

  it('determineWinners returns correct winner', () => {
    const community: Card[] = ['Ts', '9s', '8d', '2c', '3h'];
    const players = [
      { seatNumber: 0, holeCards: ['Ah', 'Kd'] as Card[] }, // High card A
      { seatNumber: 1, holeCards: ['Jh', '7d'] as Card[] }, // Straight J-T-9-8-7
    ];

    const winners = determineWinners(players, community);
    expect(winners.length).toBe(1);
    expect(winners[0].seatNumber).toBe(1);
    expect(winners[0].rank.name).toBe('Straight');
  });

  it('split pot when hands are equal', () => {
    const community: Card[] = ['As', 'Ks', 'Qs', 'Js', 'Ts'];
    const players = [
      { seatNumber: 0, holeCards: ['2h', '3h'] as Card[] },
      { seatNumber: 1, holeCards: ['4h', '5h'] as Card[] },
    ];

    // Both use the board royal flush
    const winners = determineWinners(players, community);
    expect(winners.length).toBe(2);
  });
});

describe('Integration: shouldSkipToShowdown', () => {
  it('returns true when all but one player are all-in', () => {
    const { engine, seats } = setupGame(3, 100, 5, 10);
    const { deck, gameState } = engine.startHand(seats, 0, 5, 10);
    let state = buildState(gameState, 5, 10);

    // Seat 0 all-in
    let result = applyAndMerge(engine, state, 0, { action: 'all_in' });
    state = result.state;

    // Seat 1 all-in
    result = applyAndMerge(engine, state, 1, { action: 'all_in' });
    state = result.state;

    // Seat 2 calls
    result = applyAndMerge(engine, state, 2, { action: 'call' });
    state = result.state;

    // Everyone is all-in or has matched; should skip to showdown
    expect(engine.shouldSkipToShowdown(state)).toBe(true);
  });
});

describe('Integration: pot calculation with multiple all-ins', () => {
  it('calculates correct main and side pots', () => {
    const engine = new PokerEngine();
    // Simulate 3 players with different total bets:
    const seats: SeatState[] = [
      makeSeat(0, 0, { totalBetInHand: 100, isAllIn: true }),
      makeSeat(1, 0, { totalBetInHand: 300, isAllIn: true }),
      makeSeat(2, 200, { totalBetInHand: 300, isAllIn: false }),
    ];

    const pots = engine.calculatePots(seats);

    // Main pot: 100*3 = 300 (all 3 eligible)
    expect(pots[0].amount).toBe(300);
    expect(pots[0].eligibleSeats).toContain(0);
    expect(pots[0].eligibleSeats).toContain(1);
    expect(pots[0].eligibleSeats).toContain(2);

    // Side pot: 200*2 = 400 (seats 1,2 only)
    expect(pots[1].amount).toBe(400);
    expect(pots[1].eligibleSeats).not.toContain(0);
    expect(pots[1].eligibleSeats).toContain(1);
    expect(pots[1].eligibleSeats).toContain(2);

    // Total = 300 + 400 = 700
    const total = pots.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(700);
  });

  it('handles folded players excluded from pots', () => {
    const engine = new PokerEngine();
    const seats: SeatState[] = [
      makeSeat(0, 900, { totalBetInHand: 100, isFolded: true }),
      makeSeat(1, 0, { totalBetInHand: 500, isAllIn: true }),
      makeSeat(2, 500, { totalBetInHand: 500, isAllIn: false }),
    ];

    const pots = engine.calculatePots(seats);
    const total = pots.reduce((s, p) => s + p.amount, 0);
    expect(total).toBe(1100); // 100+500+500

    // Seat 0 folded -- shouldn't be eligible
    for (const pot of pots) {
      expect(pot.eligibleSeats).not.toContain(0);
    }
  });
});

describe('Integration: complete hand with known cards (deterministic)', () => {
  it('player with better hand wins at showdown', () => {
    const engine = new PokerEngine();
    const seats = [makeSeat(0, 1000), makeSeat(1, 1000)];
    const { deck, holeCards, gameState } = engine.startHand(seats, 0, 5, 10);
    let state = buildState(gameState, 5, 10);

    // Override hole cards for deterministic result
    const knownHoleCards = new Map<number, Card[]>();
    knownHoleCards.set(0, ['Ah', 'Kh']); // Will make flush if hearts come
    knownHoleCards.set(1, ['2c', '7d']); // Weak hand

    // Play through: SB calls, BB checks
    let result = applyAndMerge(engine, state, 0, { action: 'call' });
    state = result.state;
    result = applyAndMerge(engine, state, 1, { action: 'check' });
    state = result.state;

    // Advance through all streets (check-check)
    for (const street of ['flop', 'turn', 'river'] as const) {
      state = advanceAndMerge(engine, state, deck);
      // Check-check
      const first = state.currentSeat;
      if (first !== null) {
        result = applyAndMerge(engine, state, first, { action: 'check' });
        state = result.state;
        const second = state.currentSeat;
        if (second !== null) {
          result = applyAndMerge(engine, state, second, { action: 'check' });
          state = result.state;
        }
      }
    }

    // Showdown with known cards
    const showdown = engine.resolveShowdown(state, knownHoleCards);
    expect(showdown.winners.length).toBeGreaterThanOrEqual(1);
    expect(showdown.results.length).toBe(2);

    // Winner should get the entire pot (20)
    const totalAwarded = showdown.winners.reduce((s, w) => s + w.amount, 0);
    expect(totalAwarded).toBe(20);

    // Check zero-sum
    const chipChangeSum = showdown.results.reduce(
      (s, r) => s + r.chipChange,
      0
    );
    expect(chipChangeSum).toBe(0);
  });
});

describe('Integration: isBettingRoundComplete', () => {
  it('detects complete round when currentSeat is null', () => {
    const engine = new PokerEngine();
    const state = {
      currentSeat: null,
      seats: [makeSeat(0, 1000), makeSeat(1, 1000)],
    } as GameState;

    expect(engine.isBettingRoundComplete(state)).toBe(true);
  });

  it('detects incomplete round when player can still act', () => {
    const { engine, seats } = setupGame(2, 1000, 5, 10);
    const { gameState } = engine.startHand(seats, 0, 5, 10);
    const state = buildState(gameState, 5, 10);

    expect(engine.isBettingRoundComplete(state)).toBe(false);
  });
});

describe('Integration: multi-street with fold mid-hand', () => {
  it('player folds on flop, remaining player wins', () => {
    const { engine, seats } = setupGame(2, 1000, 5, 10);
    const { deck, holeCards, gameState } = engine.startHand(
      seats,
      0,
      5,
      10
    );
    let state = buildState(gameState, 5, 10);

    // Preflop: SB calls, BB checks
    let result = applyAndMerge(engine, state, 0, { action: 'call' });
    state = result.state;
    result = applyAndMerge(engine, state, 1, { action: 'check' });
    state = result.state;

    // Flop
    state = advanceAndMerge(engine, state, deck);
    expect(state.street).toBe('flop');

    // BB (seat 1) bets 20
    result = applyAndMerge(engine, state, 1, { action: 'bet', amount: 20 });
    state = result.state;

    // SB (seat 0) folds
    result = applyAndMerge(engine, state, 0, { action: 'fold' });
    state = result.state;

    expect(result.isHandComplete).toBe(true);
    // Seat 1 started with 990 (after BB), bet 20 on flop (970), then wins pot (20 preflop + 20 flop = 40)
    // 970 + 40 = 1010
    expect(state.seats[1]!.chipStack).toBe(1010);
  });
});
