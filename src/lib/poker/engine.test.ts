import { describe, it, expect } from 'vitest';
import { PokerEngine } from './engine';
import { GameState, SeatState, Card, ActionRequest } from './types';

// ── Helpers ──────────────────────────────────────────────────────────

function createSeat(seatNumber: number, overrides?: Partial<SeatState>): SeatState {
  return {
    seatNumber,
    userId: `user-${seatNumber}`,
    nickname: `Player${seatNumber}`,
    chipStack: 1000,
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

function createGameState(overrides?: Partial<GameState>): GameState {
  const seats: (SeatState | null)[] = new Array(6).fill(null);
  seats[0] = createSeat(0);
  seats[1] = createSeat(1);
  seats[2] = createSeat(2);

  return {
    tableId: 'test-table',
    tableName: 'Test Table',
    smallBlind: 5,
    bigBlind: 10,
    maxSeats: 6,
    handId: 'hand-1',
    handNumber: 1,
    street: 'preflop',
    communityCards: [],
    pot: 15,
    sidePots: [],
    currentSeat: 0,
    currentBet: 10,
    minRaise: 10,
    dealerSeat: 0,
    seats,
    lastAction: null,
    actionClosedBySeat: 2,
    closerHasActed: false,
    turnTimeLeft: 30,
    turnStartedAt: null,
    status: 'playing',
    ...overrides,
  };
}

/** Build a full game state by actually starting a hand through the engine */
function startTestHand(
  engine: PokerEngine,
  playerSeats: SeatState[],
  dealerSeat: number,
  sb = 5,
  bb = 10
) {
  const { gameState, holeCards, deck, events } = engine.startHand(playerSeats, dealerSeat, sb, bb);

  const fullState: GameState = {
    tableId: 'test-table',
    tableName: 'Test Table',
    smallBlind: sb,
    bigBlind: bb,
    maxSeats: 6,
    handId: 'hand-1',
    handNumber: 1,
    turnTimeLeft: 30,
    turnStartedAt: null,
    ...gameState,
  } as GameState;

  return { gameState: fullState, holeCards, deck, events };
}

/** Apply an action and merge the new state back into the full game state */
function applyAndMerge(
  engine: PokerEngine,
  state: GameState,
  seatNumber: number,
  action: ActionRequest
): { state: GameState; events: ReturnType<PokerEngine['applyAction']>['events']; isHandComplete: boolean } {
  const result = engine.applyAction(state, seatNumber, action);
  const merged: GameState = { ...state, ...result.newState };
  return { state: merged, events: result.events, isHandComplete: result.isHandComplete };
}

// ── Tests ────────────────────────────────────────────────────────────

const engine = new PokerEngine();

describe('PokerEngine', () => {
  // ────────────────────────────────────────────────────────────────────
  // startHand
  // ────────────────────────────────────────────────────────────────────
  describe('startHand', () => {
    it('2인 헤즈업: BTN=SB, 상대=BB', () => {
      const seats = [createSeat(0), createSeat(1)];
      const { gameState } = engine.startHand(seats, 0, 5, 10);

      // In heads-up, the dealer (seat 0) is the SB
      const sb = gameState.seats![0]!;
      const bb = gameState.seats![1]!;
      expect(sb.betInRound).toBe(5);
      expect(bb.betInRound).toBe(10);
    });

    it('6인: SB=딜러 다음, BB=SB 다음', () => {
      const seats = [createSeat(0), createSeat(1), createSeat(2), createSeat(3)];
      const { gameState, events } = engine.startHand(seats, 0, 5, 10);

      // Dealer is seat 0. SB = seat 1, BB = seat 2
      const blindEvents = events.filter(e => e.type === 'post_blind');
      expect(blindEvents).toHaveLength(2);
      expect(blindEvents[0]).toMatchObject({ seatNumber: 1, blindType: 'small' });
      expect(blindEvents[1]).toMatchObject({ seatNumber: 2, blindType: 'big' });
    });

    it('블라인드 정확히 차감', () => {
      const seats = [createSeat(0), createSeat(1), createSeat(2)];
      const { gameState } = engine.startHand(seats, 0, 5, 10);

      // SB = seat 1, BB = seat 2
      expect(gameState.seats![1]!.chipStack).toBe(995); // 1000 - 5
      expect(gameState.seats![2]!.chipStack).toBe(990); // 1000 - 10
    });

    it('홀카드 2장씩 딜', () => {
      const seats = [createSeat(0), createSeat(1), createSeat(2)];
      const { holeCards } = engine.startHand(seats, 0, 5, 10);

      expect(holeCards.size).toBe(3);
      for (const [, cards] of holeCards) {
        expect(cards).toHaveLength(2);
      }
    });

    it('프리플랍 firstToAct: 헤즈업=SB, 멀티=UTG', () => {
      // Heads-up: SB (dealer) acts first preflop
      const headsUp = engine.startHand([createSeat(0), createSeat(1)], 0, 5, 10);
      expect(headsUp.gameState.currentSeat).toBe(0); // Dealer/SB = seat 0

      // Multi-way: UTG (left of BB) acts first
      const multi = engine.startHand(
        [createSeat(0), createSeat(1), createSeat(2), createSeat(3)],
        0, 5, 10
      );
      // Dealer=0, SB=1, BB=2, UTG=3
      expect(multi.gameState.currentSeat).toBe(3);
    });

    it('actionClosedBySeat = BB (BB 옵션)', () => {
      const seats = [createSeat(0), createSeat(1), createSeat(2)];
      const { gameState } = engine.startHand(seats, 0, 5, 10);

      // BB is seat 2 (dealer=0, SB=1, BB=2)
      expect(gameState.actionClosedBySeat).toBe(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // validateAction
  // ────────────────────────────────────────────────────────────────────
  describe('validateAction', () => {
    it('본인 차례 아니면 invalid', () => {
      const state = createGameState({ currentSeat: 0 });
      const result = engine.validateAction(state, 1, { action: 'check' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Not your turn');
    });

    it('폴드한 플레이어는 invalid', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { isFolded: true });
      seats[1] = createSeat(1);
      const state = createGameState({ seats, currentSeat: 0 });

      const result = engine.validateAction(state, 0, { action: 'check' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('folded');
    });

    it('올인 플레이어는 invalid', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { isAllIn: true });
      seats[1] = createSeat(1);
      const state = createGameState({ seats, currentSeat: 0 });

      const result = engine.validateAction(state, 0, { action: 'check' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('all-in');
    });

    it('check: 베팅 없을 때만 valid', () => {
      // currentBet matches betInRound -> can check
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 10 });
      seats[1] = createSeat(1);
      const state = createGameState({ seats, currentSeat: 0, currentBet: 10 });
      expect(engine.validateAction(state, 0, { action: 'check' }).valid).toBe(true);

      // currentBet > betInRound -> cannot check
      const state2 = createGameState({ seats, currentSeat: 0, currentBet: 20 });
      const result2 = engine.validateAction(state2, 0, { action: 'check' });
      expect(result2.valid).toBe(false);
    });

    it('call: 베팅 있을 때만 valid', () => {
      // There is a bet to call
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0 });
      seats[1] = createSeat(1);
      const state = createGameState({ seats, currentSeat: 0, currentBet: 10 });
      expect(engine.validateAction(state, 0, { action: 'call' }).valid).toBe(true);

      // No bet to call (can check instead)
      const state2 = createGameState({ seats, currentSeat: 0, currentBet: 0 });
      const result2 = engine.validateAction(state2, 0, { action: 'call' });
      expect(result2.valid).toBe(false);
    });

    it('bet: 베팅 없을 때만 valid, 최소 BB', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0 });
      seats[1] = createSeat(1);

      // No existing bet -> can bet
      const state = createGameState({ seats, currentSeat: 0, currentBet: 0, bigBlind: 10 });
      expect(engine.validateAction(state, 0, { action: 'bet', amount: 10 }).valid).toBe(true);

      // Below minimum
      const result2 = engine.validateAction(state, 0, { action: 'bet', amount: 5 });
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('Minimum bet');

      // There is already a bet -> cannot bet, must raise
      const state3 = createGameState({ seats, currentSeat: 0, currentBet: 10, bigBlind: 10 });
      const result3 = engine.validateAction(state3, 0, { action: 'bet', amount: 20 });
      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('raise');
    });

    it('raise: 베팅 있을 때만 valid, 최소 minRaise', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0 });
      seats[1] = createSeat(1);

      // There is a bet -> can raise
      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 10,
        minRaise: 10,
        bigBlind: 10,
      });
      // minRaiseTotal = currentBet + minRaise = 20
      expect(engine.validateAction(state, 0, { action: 'raise', amount: 20 }).valid).toBe(true);

      // Below minimum raise
      const result2 = engine.validateAction(state, 0, { action: 'raise', amount: 15 });
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('Minimum raise');

      // No bet to raise -> must use bet
      const state3 = createGameState({ seats, currentSeat: 0, currentBet: 0, bigBlind: 10 });
      const result3 = engine.validateAction(state3, 0, { action: 'raise', amount: 20 });
      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('bet');
    });

    it('all_in: 칩 있을 때만 valid', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { chipStack: 100 });
      seats[1] = createSeat(1);
      const state = createGameState({ seats, currentSeat: 0 });
      expect(engine.validateAction(state, 0, { action: 'all_in' }).valid).toBe(true);

      // No chips
      const seats2: (SeatState | null)[] = new Array(6).fill(null);
      seats2[0] = createSeat(0, { chipStack: 0 });
      seats2[1] = createSeat(1);
      const state2 = createGameState({ seats: seats2, currentSeat: 0 });
      const result2 = engine.validateAction(state2, 0, { action: 'all_in' });
      expect(result2.valid).toBe(false);
      expect(result2.error).toContain('No chips');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // applyAction
  // ────────────────────────────────────────────────────────────────────
  describe('applyAction', () => {
    // ── fold ──
    it('fold: isFolded=true, 1명 남으면 핸드 종료', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 10, totalBetInHand: 10, chipStack: 990 });
      seats[1] = createSeat(1, { betInRound: 10, totalBetInHand: 10, chipStack: 990 });
      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 10,
        pot: 20,
        actionClosedBySeat: 1,
      });

      const result = engine.applyAction(state, 0, { action: 'fold' });
      expect(result.newState.seats![0]!.isFolded).toBe(true);
      expect(result.isHandComplete).toBe(true);
      // Winner gets the pot
      expect(result.events.some(e => e.type === 'pot_awarded' && e.seatNumber === 1)).toBe(true);
    });

    it('fold: closer가 fold하면 새 closer 할당', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0);
      seats[1] = createSeat(1);
      seats[2] = createSeat(2);
      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 10,
        pot: 25,
        actionClosedBySeat: 0, // closer is the one folding
      });

      const result = engine.applyAction(state, 0, { action: 'fold' });
      // Closer should move to the next active player
      expect(result.newState.actionClosedBySeat).not.toBe(0);
      expect(result.newState.actionClosedBySeat).toBe(1);
    });

    // ── check ──
    it('check: 상태 변경 없음, 다음 플레이어로', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0 });
      seats[1] = createSeat(1, { betInRound: 0 });
      seats[2] = createSeat(2, { betInRound: 0 });
      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 0,
        pot: 0,
        actionClosedBySeat: 2,
        closerHasActed: false,
        street: 'flop',
      });

      const result = engine.applyAction(state, 0, { action: 'check' });
      // Chip stacks unchanged
      expect(result.newState.seats![0]!.chipStack).toBe(1000);
      // Next player should be seat 1
      expect(result.newState.currentSeat).toBe(1);
    });

    it('check-around: 모두 체크 → currentSeat=null (라운드 종료)', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0 });
      seats[1] = createSeat(1, { betInRound: 0 });
      seats[2] = createSeat(2, { betInRound: 0 });

      let state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 0,
        pot: 0,
        actionClosedBySeat: 2,
        closerHasActed: false,
        street: 'flop',
      });

      // Seat 0 checks
      let r = applyAndMerge(engine, state, 0, { action: 'check' });
      expect(r.state.currentSeat).toBe(1);

      // Seat 1 checks
      r = applyAndMerge(engine, r.state, 1, { action: 'check' });
      expect(r.state.currentSeat).toBe(2); // closer hasn't acted yet

      // Seat 2 (closer) checks -> round complete
      r = applyAndMerge(engine, r.state, 2, { action: 'check' });
      expect(r.state.currentSeat).toBe(null);
    });

    // ── call ──
    it('call: chipStack 차감, betInRound 증가', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0, chipStack: 1000 });
      seats[1] = createSeat(1, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });
      seats[2] = createSeat(2, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 10,
        pot: 20,
        actionClosedBySeat: 2,
        closerHasActed: false,
      });

      const result = engine.applyAction(state, 0, { action: 'call' });
      const seat0 = result.newState.seats![0]!;
      expect(seat0.chipStack).toBe(990);
      expect(seat0.betInRound).toBe(10);
      expect(seat0.totalBetInHand).toBe(10);
      expect(result.newState.pot).toBe(30);
    });

    it('call 올인: 가능한 만큼만 콜', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0, chipStack: 5 }); // Only 5 chips
      seats[1] = createSeat(1, { betInRound: 100, chipStack: 900, totalBetInHand: 100 });
      seats[2] = createSeat(2, { betInRound: 100, chipStack: 900, totalBetInHand: 100 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 100,
        pot: 200,
        actionClosedBySeat: 2,
      });

      const result = engine.applyAction(state, 0, { action: 'call' });
      const seat0 = result.newState.seats![0]!;
      expect(seat0.chipStack).toBe(0);
      expect(seat0.betInRound).toBe(5);
      expect(seat0.isAllIn).toBe(true);
    });

    // ── bet ──
    it('bet: currentBet 설정, closer=bettor', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0, chipStack: 1000 });
      seats[1] = createSeat(1, { betInRound: 0 });
      seats[2] = createSeat(2, { betInRound: 0 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 0,
        pot: 0,
        street: 'flop',
        actionClosedBySeat: 2,
        closerHasActed: false,
      });

      const result = engine.applyAction(state, 0, { action: 'bet', amount: 20 });
      expect(result.newState.currentBet).toBe(20);
      expect(result.newState.actionClosedBySeat).toBe(0); // bettor becomes closer
      expect(result.newState.seats![0]!.chipStack).toBe(980);
      expect(result.newState.seats![0]!.betInRound).toBe(20);
    });

    // ── raise ──
    it('raise: currentBet 업데이트, minRaise 업데이트, closer=raiser', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0, chipStack: 1000 });
      seats[1] = createSeat(1, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });
      seats[2] = createSeat(2, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 10,
        minRaise: 10,
        pot: 20,
        actionClosedBySeat: 2,
      });

      const result = engine.applyAction(state, 0, { action: 'raise', amount: 30 });
      expect(result.newState.currentBet).toBe(30);
      // raiseSize = 30 - 10 = 20, which is >= minRaise(10), so minRaise updated to 20
      expect(result.newState.minRaise).toBe(20);
      expect(result.newState.actionClosedBySeat).toBe(0); // raiser becomes closer
    });

    // ── all_in ──
    it('all_in: chipStack=0, isAllIn=true', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0, chipStack: 500 });
      seats[1] = createSeat(1, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });
      seats[2] = createSeat(2, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 10,
        minRaise: 10,
        pot: 20,
        actionClosedBySeat: 2,
      });

      const result = engine.applyAction(state, 0, { action: 'all_in' });
      const seat0 = result.newState.seats![0]!;
      expect(seat0.chipStack).toBe(0);
      expect(seat0.isAllIn).toBe(true);
      expect(seat0.betInRound).toBe(500);
    });

    it('all_in short: raiseSize < minRaise → isAggressive=false', () => {
      // Player has only 15 chips. currentBet=10, minRaise=10.
      // newBetTotal = 15, raiseSize = 15 - 10 = 5, which < minRaise(10)
      // So this should NOT be aggressive (no reopening of action)
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0, chipStack: 15 });
      seats[1] = createSeat(1, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });
      seats[2] = createSeat(2, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 10,
        minRaise: 10,
        pot: 20,
        actionClosedBySeat: 2,
        closerHasActed: true,
      });

      const result = engine.applyAction(state, 0, { action: 'all_in' });
      // Not aggressive -> closer should NOT be changed to this seat
      // The closer was seat 2 and should remain (or be moved because the
      // closer went all-in only if closedBySeat === seatNumber, which is not the case here)
      expect(result.newState.actionClosedBySeat).toBe(2);
    });

    it('short all-in: 이미 액션한 플레이어는 callOnlySeats에 추가', () => {
      // Seat 1 and 2 already called at currentBet=10. Seat 0 short all-in to 15.
      // Seats 1 and 2 should be restricted to call/fold only.
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0, chipStack: 15 });
      seats[1] = createSeat(1, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });
      seats[2] = createSeat(2, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 10,
        minRaise: 10,
        pot: 20,
        actionClosedBySeat: 2,
        closerHasActed: true,
      });

      const result = engine.applyAction(state, 0, { action: 'all_in' });
      expect(result.newState.callOnlySeats).toEqual(expect.arrayContaining([1, 2]));
    });

    it('short all-in: callOnly 플레이어는 raise 불가', () => {
      // After short all-in, seat 1 (in callOnlySeats) tries to raise -> invalid
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 15, chipStack: 0, isAllIn: true, totalBetInHand: 15 });
      seats[1] = createSeat(1, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });
      seats[2] = createSeat(2, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });

      const state = createGameState({
        seats,
        currentSeat: 1,
        currentBet: 15,
        minRaise: 10,
        pot: 35,
        actionClosedBySeat: 2,
        closerHasActed: true,
        callOnlySeats: [1, 2],
      });

      // Raise should be blocked
      const raiseResult = engine.validateAction(state, 1, { action: 'raise', amount: 30 });
      expect(raiseResult.valid).toBe(false);
      expect(raiseResult.error).toContain('short all-in');

      // Call should still be allowed
      const callResult = engine.validateAction(state, 1, { action: 'call' });
      expect(callResult.valid).toBe(true);

      // Fold should still be allowed
      const foldResult = engine.validateAction(state, 1, { action: 'fold' });
      expect(foldResult.valid).toBe(true);
    });

    it('full raise 후 callOnlySeats 초기화', () => {
      // A full raise should clear callOnlySeats
      const seats: (SeatState | null)[] = new Array(9).fill(null);
      seats[0] = createSeat(0, { betInRound: 15, chipStack: 0, isAllIn: true, totalBetInHand: 15 });
      seats[1] = createSeat(1, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });
      seats[2] = createSeat(2, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });
      seats[3] = createSeat(3, { betInRound: 0, chipStack: 1000 });

      const state = createGameState({
        seats,
        currentSeat: 3,
        currentBet: 15,
        minRaise: 10,
        pot: 35,
        actionClosedBySeat: 2,
        closerHasActed: true,
        callOnlySeats: [1, 2],
      });

      // Seat 3 (not in callOnlySeats, hasn't acted) makes a full raise
      const result = engine.applyAction(state, 3, { action: 'raise', amount: 30 });
      // Full raise clears the restriction
      expect(result.newState.callOnlySeats).toEqual([]);
    });

    it('advanceStreet 시 callOnlySeats 초기화', () => {
      const seats = [createSeat(0), createSeat(1), createSeat(2)];
      const { gameState, deck } = startTestHand(engine, seats, 0);

      // Manually set callOnlySeats to simulate a short all-in occurred
      gameState.callOnlySeats = [1, 2];

      const result = engine.advanceStreet(gameState, deck);
      expect(result.newState.callOnlySeats).toEqual([]);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // advanceStreet
  // ────────────────────────────────────────────────────────────────────
  describe('advanceStreet', () => {
    it('preflop → flop: 3장 커뮤니티', () => {
      const { gameState, deck } = startTestHand(
        engine,
        [createSeat(0), createSeat(1), createSeat(2)],
        0
      );

      const result = engine.advanceStreet(gameState, deck);
      expect(result.newState.street).toBe('flop');
      expect(result.newCards).toHaveLength(3);
      expect(result.newState.communityCards).toHaveLength(3);
    });

    it('flop → turn: 1장 추가', () => {
      const { gameState, deck } = startTestHand(
        engine,
        [createSeat(0), createSeat(1), createSeat(2)],
        0
      );

      // Advance to flop first
      const flopResult = engine.advanceStreet(gameState, deck);
      const flopState: GameState = { ...gameState, ...flopResult.newState } as GameState;

      const turnResult = engine.advanceStreet(flopState, deck);
      expect(turnResult.newState.street).toBe('turn');
      expect(turnResult.newCards).toHaveLength(1);
      expect(turnResult.newState.communityCards).toHaveLength(4);
    });

    it('turn → river: 1장 추가', () => {
      const { gameState, deck } = startTestHand(
        engine,
        [createSeat(0), createSeat(1), createSeat(2)],
        0
      );

      const flopResult = engine.advanceStreet(gameState, deck);
      const flopState: GameState = { ...gameState, ...flopResult.newState } as GameState;

      const turnResult = engine.advanceStreet(flopState, deck);
      const turnState: GameState = { ...flopState, ...turnResult.newState } as GameState;

      const riverResult = engine.advanceStreet(turnState, deck);
      expect(riverResult.newState.street).toBe('river');
      expect(riverResult.newCards).toHaveLength(1);
      expect(riverResult.newState.communityCards).toHaveLength(5);
    });

    it('river → showdown', () => {
      const { gameState, deck } = startTestHand(
        engine,
        [createSeat(0), createSeat(1), createSeat(2)],
        0
      );

      let state: GameState = { ...gameState, ...engine.advanceStreet(gameState, deck).newState } as GameState;
      state = { ...state, ...engine.advanceStreet(state, deck).newState } as GameState;
      state = { ...state, ...engine.advanceStreet(state, deck).newState } as GameState;

      const result = engine.advanceStreet(state, deck);
      expect(result.newState.street).toBe('showdown');
    });

    it('betInRound 모두 0으로 리셋', () => {
      const seats = [createSeat(0), createSeat(1), createSeat(2)];
      const { gameState, deck } = startTestHand(engine, seats, 0);

      const result = engine.advanceStreet(gameState, deck);
      for (const seat of result.newState.seats!) {
        if (seat !== null) {
          expect(seat.betInRound).toBe(0);
        }
      }
    });

    it('currentBet=0, minRaise=BB', () => {
      const seats = [createSeat(0), createSeat(1), createSeat(2)];
      const { gameState, deck } = startTestHand(engine, seats, 0, 5, 10);

      const result = engine.advanceStreet(gameState, deck);
      expect(result.newState.currentBet).toBe(0);
      expect(result.newState.minRaise).toBe(10); // BB
    });

    it('firstToAct: 딜러 왼쪽 첫 active', () => {
      // Dealer=0, so first active after dealer should be seat 1
      const seats = [createSeat(0), createSeat(1), createSeat(2)];
      const { gameState, deck } = startTestHand(engine, seats, 0);

      const result = engine.advanceStreet(gameState, deck);
      expect(result.newState.currentSeat).toBe(1);
    });

    it('closer: firstToAct 직전 플레이어', () => {
      const seats = [createSeat(0), createSeat(1), createSeat(2)];
      const { gameState, deck } = startTestHand(engine, seats, 0);

      const result = engine.advanceStreet(gameState, deck);
      // firstToAct = 1, so closer = seat before 1 going clockwise backwards = seat 0
      expect(result.newState.actionClosedBySeat).toBe(0);
      expect(result.newState.closerHasActed).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // calculatePots
  // ────────────────────────────────────────────────────────────────────
  describe('calculatePots', () => {
    it('올인 없으면 메인팟 1개', () => {
      const seats = [
        createSeat(0, { totalBetInHand: 100, chipStack: 900 }),
        createSeat(1, { totalBetInHand: 100, chipStack: 900 }),
        createSeat(2, { totalBetInHand: 100, chipStack: 900 }),
      ];

      const pots = engine.calculatePots(seats);
      expect(pots).toHaveLength(1);
      expect(pots[0].amount).toBe(300);
      expect(pots[0].eligibleSeats).toEqual(expect.arrayContaining([0, 1, 2]));
    });

    it('1명 올인: 메인팟 + 사이드팟', () => {
      const seats = [
        createSeat(0, { totalBetInHand: 50, chipStack: 0, isAllIn: true }),
        createSeat(1, { totalBetInHand: 100, chipStack: 900 }),
        createSeat(2, { totalBetInHand: 100, chipStack: 900 }),
      ];

      const pots = engine.calculatePots(seats);
      expect(pots).toHaveLength(2);
      // Main pot: 50 * 3 = 150 (all eligible)
      expect(pots[0].amount).toBe(150);
      expect(pots[0].eligibleSeats).toEqual(expect.arrayContaining([0, 1, 2]));
      // Side pot: (100-50) * 2 = 100 (only seats 1, 2)
      expect(pots[1].amount).toBe(100);
      expect(pots[1].eligibleSeats).toEqual(expect.arrayContaining([1, 2]));
      expect(pots[1].eligibleSeats).not.toContain(0);
    });

    it('2명 다른 금액 올인: 3개 팟', () => {
      const seats = [
        createSeat(0, { totalBetInHand: 30, chipStack: 0, isAllIn: true }),
        createSeat(1, { totalBetInHand: 80, chipStack: 0, isAllIn: true }),
        createSeat(2, { totalBetInHand: 200, chipStack: 800 }),
      ];

      const pots = engine.calculatePots(seats);
      expect(pots).toHaveLength(3);
      // Pot 1: 30 * 3 = 90
      expect(pots[0].amount).toBe(90);
      expect(pots[0].eligibleSeats).toEqual(expect.arrayContaining([0, 1, 2]));
      // Pot 2: (80-30) * 2 = 100
      expect(pots[1].amount).toBe(100);
      expect(pots[1].eligibleSeats).toEqual(expect.arrayContaining([1, 2]));
      expect(pots[1].eligibleSeats).not.toContain(0);
      // Pot 3: (200-80) * 1 = 120
      expect(pots[2].amount).toBe(120);
      expect(pots[2].eligibleSeats).toEqual([2]);
    });

    it('폴드한 플레이어 기여분 포함, 자격 제외', () => {
      const seats = [
        createSeat(0, { totalBetInHand: 100, isFolded: true }),
        createSeat(1, { totalBetInHand: 100, chipStack: 900 }),
        createSeat(2, { totalBetInHand: 100, chipStack: 900 }),
      ];

      const pots = engine.calculatePots(seats);
      expect(pots).toHaveLength(1);
      // Total includes folded player's contribution
      expect(pots[0].amount).toBe(300);
      // But folded player is NOT eligible
      expect(pots[0].eligibleSeats).not.toContain(0);
      expect(pots[0].eligibleSeats).toEqual(expect.arrayContaining([1, 2]));
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // resolveShowdown
  // ────────────────────────────────────────────────────────────────────
  describe('resolveShowdown', () => {
    it('승자에게 팟 전액 지급', () => {
      const communityCards: Card[] = ['2h', '3h', '4h', '5h', '9d'];
      const holeCards = new Map<number, Card[]>();
      holeCards.set(0, ['Ah', 'Kh']); // Flush
      holeCards.set(1, ['Tc', 'Jd']); // High Card

      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { totalBetInHand: 100, chipStack: 900 });
      seats[1] = createSeat(1, { totalBetInHand: 100, chipStack: 900 });

      const state = createGameState({
        seats,
        communityCards,
        pot: 200,
        street: 'showdown',
      });

      const result = engine.resolveShowdown(state, holeCards);
      expect(result.winners).toHaveLength(1);
      expect(result.winners[0].seatNumber).toBe(0);
      expect(result.winners[0].amount).toBe(200);
    });

    it('타이: 균등 분배', () => {
      const communityCards: Card[] = ['2h', '3d', '4c', '5s', '9h'];
      const holeCards = new Map<number, Card[]>();
      // Both players play the board with same kickers
      holeCards.set(0, ['Kh', 'Qh']);
      holeCards.set(1, ['Kd', 'Qd']);

      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { totalBetInHand: 100, chipStack: 900 });
      seats[1] = createSeat(1, { totalBetInHand: 100, chipStack: 900 });

      const state = createGameState({
        seats,
        communityCards,
        pot: 200,
        dealerSeat: 0,
      });

      const result = engine.resolveShowdown(state, holeCards);
      expect(result.winners).toHaveLength(2);
      // Each gets 100
      const totalAwarded = result.winners.reduce((sum, w) => sum + w.amount, 0);
      expect(totalAwarded).toBe(200);
    });

    it('홀수 칩: 딜러 왼쪽 가장 가까운 승자', () => {
      const communityCards: Card[] = ['2h', '3d', '4c', '5s', '9h'];
      const holeCards = new Map<number, Card[]>();
      holeCards.set(1, ['Kh', 'Qh']);
      holeCards.set(3, ['Kd', 'Qd']);

      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[1] = createSeat(1, { totalBetInHand: 100, chipStack: 900 });
      seats[3] = createSeat(3, { totalBetInHand: 100, chipStack: 900 });
      // Add a folded player for odd pot
      seats[4] = createSeat(4, { totalBetInHand: 1, chipStack: 999, isFolded: true });

      const state = createGameState({
        seats,
        communityCards,
        pot: 201, // Odd amount
        dealerSeat: 0,
      });

      const result = engine.resolveShowdown(state, holeCards);
      expect(result.winners).toHaveLength(2);
      // Seat 1 is closer to dealer's left (seat 0), so gets the odd chip
      const seat1Win = result.winners.find(w => w.seatNumber === 1)!;
      const seat3Win = result.winners.find(w => w.seatNumber === 3)!;
      expect(seat1Win.amount + seat3Win.amount).toBe(201);
      // One gets 101, the other gets 100
      expect(Math.abs(seat1Win.amount - seat3Win.amount)).toBe(1);
    });

    it('사이드팟: 각 팟 별도 승자 결정', () => {
      const communityCards: Card[] = ['2h', '3d', '4c', '5s', '9h'];
      const holeCards = new Map<number, Card[]>();
      holeCards.set(0, ['Ah', 'Kh']); // Best hand - short stack all-in
      holeCards.set(1, ['7c', '8c']); // Worst hand
      holeCards.set(2, ['Td', 'Jd']); // Middle hand

      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { totalBetInHand: 50, chipStack: 0, isAllIn: true });
      seats[1] = createSeat(1, { totalBetInHand: 100, chipStack: 900 });
      seats[2] = createSeat(2, { totalBetInHand: 100, chipStack: 900 });

      const state = createGameState({
        seats,
        communityCards,
        pot: 250,
      });

      const result = engine.resolveShowdown(state, holeCards);
      // Seat 0 should win the main pot (best hand), seat 2 should win the side pot (better than seat 1)
      expect(result.winners.some(w => w.seatNumber === 0)).toBe(true);
      expect(result.winners.some(w => w.seatNumber === 2)).toBe(true);
    });

    it('chipChange = 획득 - 투자', () => {
      const communityCards: Card[] = ['2h', '3d', '4c', '5s', '9h'];
      const holeCards = new Map<number, Card[]>();
      holeCards.set(0, ['Ah', 'Kh']); // Winner
      holeCards.set(1, ['7c', '8c']); // Loser

      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { totalBetInHand: 100, chipStack: 900 });
      seats[1] = createSeat(1, { totalBetInHand: 100, chipStack: 900 });

      const state = createGameState({
        seats,
        communityCards,
        pot: 200,
      });

      const result = engine.resolveShowdown(state, holeCards);
      const seat0Result = result.results.find(r => r.seatNumber === 0)!;
      const seat1Result = result.results.find(r => r.seatNumber === 1)!;
      // Winner: won 200, invested 100 -> chipChange = +100
      expect(seat0Result.chipChange).toBe(100);
      // Loser: won 0, invested 100 -> chipChange = -100
      expect(seat1Result.chipChange).toBe(-100);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Edge cases
  // ────────────────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('BB 칩 부족: 숏 블라인드 올인', () => {
      const seats = [
        createSeat(0, { chipStack: 1000 }),
        createSeat(1, { chipStack: 3 }), // Can only post partial BB
      ];

      const { gameState, events } = engine.startHand(seats, 0, 5, 10);

      // Heads-up: dealer(0)=SB, seat(1)=BB
      // SB posts 5, BB can only post 3
      const sbSeat = gameState.seats![0]!;
      const bbSeat = gameState.seats![1]!;

      expect(sbSeat.betInRound).toBe(5);
      expect(bbSeat.betInRound).toBe(3); // Only had 3
      expect(bbSeat.chipStack).toBe(0);
      expect(bbSeat.isAllIn).toBe(true);
    });

    it('모두 올인: 남은 플레이어 0명 → null seat', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 100, chipStack: 100, totalBetInHand: 100 });
      seats[1] = createSeat(1, { betInRound: 100, chipStack: 0, isAllIn: true, totalBetInHand: 100 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 100,
        pot: 200,
        minRaise: 100,
        actionClosedBySeat: 0,
        closerHasActed: false,
      });

      // Seat 0 goes all-in
      const result = engine.applyAction(state, 0, { action: 'all_in' });
      // Both are all-in, no one can act
      expect(result.newState.currentSeat).toBe(null);
    });

    it('shouldSkipToShowdown: 1명만 act 가능', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { chipStack: 500 }); // Can act
      seats[1] = createSeat(1, { chipStack: 0, isAllIn: true });
      seats[2] = createSeat(2, { chipStack: 0, isAllIn: true });

      const state = createGameState({
        seats,
        street: 'flop',
      });

      // 2 active (non-folded) but only 1 can act
      expect(engine.shouldSkipToShowdown(state)).toBe(true);
    });

    it('shouldSkipToShowdown: false when 2+ can act', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { chipStack: 500 });
      seats[1] = createSeat(1, { chipStack: 500 });
      seats[2] = createSeat(2, { chipStack: 0, isAllIn: true });

      const state = createGameState({
        seats,
        street: 'flop',
      });

      expect(engine.shouldSkipToShowdown(state)).toBe(false);
    });

    it('shouldSkipToShowdown: false when only 1 active total', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { chipStack: 500 });
      seats[1] = createSeat(1, { isFolded: true });
      seats[2] = createSeat(2, { isFolded: true });

      const state = createGameState({
        seats,
        street: 'flop',
      });

      // Only 1 active player -> hand should already be complete, not skip to showdown
      expect(engine.shouldSkipToShowdown(state)).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // isBettingRoundComplete
  // ────────────────────────────────────────────────────────────────────
  describe('isBettingRoundComplete', () => {
    it('currentSeat=null 이면 complete', () => {
      const state = createGameState({ currentSeat: null });
      expect(engine.isBettingRoundComplete(state)).toBe(true);
    });

    it('acting 가능한 플레이어가 없으면 complete', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { isAllIn: true });
      seats[1] = createSeat(1, { isAllIn: true });

      const state = createGameState({ seats, currentSeat: 0 });
      expect(engine.isBettingRoundComplete(state)).toBe(true);
    });

    it('active 플레이어가 1명 이하면 complete', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0);
      seats[1] = createSeat(1, { isFolded: true });

      const state = createGameState({ seats, currentSeat: 0 });
      expect(engine.isBettingRoundComplete(state)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // getNextSeat
  // ────────────────────────────────────────────────────────────────────
  describe('getNextSeat', () => {
    it('다음 active 플레이어를 반환', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0);
      seats[1] = createSeat(1, { isFolded: true });
      seats[2] = createSeat(2);

      const next = engine.getNextSeat(seats, 0);
      expect(next).toBe(2); // seat 1 folded, so skip to 2
    });

    it('모두 folded/all-in 이면 null 반환', () => {
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { isAllIn: true });
      seats[1] = createSeat(1, { isFolded: true });

      const next = engine.getNextSeat(seats, 0);
      expect(next).toBe(null);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Integration: full hand scenario
  // ────────────────────────────────────────────────────────────────────
  describe('integration: full preflop round', () => {
    it('3인 프리플랍: UTG call, SB call, BB check → round complete', () => {
      const seats = [createSeat(0), createSeat(1), createSeat(2)];
      // dealer=0, SB=1, BB=2, UTG/firstToAct=0 (wraps around since only 3 players)
      // Wait, with 3 players: dealer=0, SB=1, BB=2
      // firstToAct preflop (multi) = next active after BB = 0 (UTG)
      const { gameState, deck } = startTestHand(engine, seats, 0, 5, 10);

      let state = gameState;
      expect(state.currentSeat).toBe(0); // UTG acts first

      // UTG calls
      let r = applyAndMerge(engine, state, 0, { action: 'call' });
      state = r.state;
      expect(state.currentSeat).toBe(1); // SB next

      // SB calls (needs to add 5 more to match BB of 10)
      r = applyAndMerge(engine, state, 1, { action: 'call' });
      state = r.state;
      expect(state.currentSeat).toBe(2); // BB gets option

      // BB checks (BB option)
      r = applyAndMerge(engine, state, 2, { action: 'check' });
      state = r.state;
      expect(state.currentSeat).toBe(null); // Round complete
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Additional edge cases (TDD round)
  // ────────────────────────────────────────────────────────────────────
  describe('additional edge cases', () => {
    it('multiple consecutive short all-ins: restricted players accumulate', () => {
      // Setup: 4 players. currentBet=10, minRaise=10.
      // Player A (seat 3) short all-in to 15 (raiseSize=5 < minRaise=10).
      // Players 1 and 2 (already at 10) become callOnly.
      // Then player 1 calls to 15, player 2 also calls to 15.
      // Nobody can re-raise because all who acted at the previous level are restricted.
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 10, chipStack: 990, totalBetInHand: 10 }); // Dealer, already acted
      seats[1] = createSeat(1, { betInRound: 10, chipStack: 990, totalBetInHand: 10 }); // SB, already acted
      seats[2] = createSeat(2, { betInRound: 10, chipStack: 990, totalBetInHand: 10 }); // BB, already acted
      seats[3] = createSeat(3, { betInRound: 0, chipStack: 15 }); // Short stack, hasn't acted

      let state = createGameState({
        seats,
        currentSeat: 3,
        currentBet: 10,
        minRaise: 10,
        pot: 30,
        actionClosedBySeat: 2,
        closerHasActed: true,
      });

      // Seat 3 goes short all-in (15 chips)
      let r = applyAndMerge(engine, state, 3, { action: 'all_in' });
      state = r.state;

      // Seats 0, 1, 2 should all be in callOnlySeats (they were at currentBet=10)
      expect(state.callOnlySeats).toEqual(expect.arrayContaining([0, 1, 2]));

      // Seat 0 tries to raise -> should be blocked
      const raiseResult = engine.validateAction(state, 0, { action: 'raise', amount: 30 });
      expect(raiseResult.valid).toBe(false);
      expect(raiseResult.error).toContain('short all-in');

      // Seat 0 can still call
      const callResult = engine.validateAction(state, 0, { action: 'call' });
      expect(callResult.valid).toBe(true);
    });

    it('exact minimum raise is NOT a short all-in', () => {
      // currentBet=10, minRaise=10. Player goes all-in for exactly 20.
      // raiseSize = 20 - 10 = 10 = minRaise. This is a FULL raise.
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { betInRound: 0, chipStack: 20 }); // Exactly enough for min raise
      seats[1] = createSeat(1, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });
      seats[2] = createSeat(2, { betInRound: 10, chipStack: 990, totalBetInHand: 10 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 10,
        minRaise: 10,
        pot: 20,
        actionClosedBySeat: 2,
        closerHasActed: true,
      });

      const result = engine.applyAction(state, 0, { action: 'all_in' });

      // Full raise -> callOnlySeats should be cleared (empty)
      expect(result.newState.callOnlySeats).toEqual([]);
      // Full raise -> closer moves to the raiser
      expect(result.newState.actionClosedBySeat).toBe(0);
      // minRaise should update: raiseSize = 20 - 10 = 10 >= minRaise(10)
      expect(result.newState.minRaise).toBe(10);
    });

    it('callOnlySeats cleared on advanceStreet after multi-street scenario', () => {
      // Start a hand, simulate short all-in creating callOnlySeats,
      // then advance to flop and verify callOnlySeats is cleared.
      const seats = [
        createSeat(0, { chipStack: 1000 }),
        createSeat(1, { chipStack: 1000 }),
        createSeat(2, { chipStack: 1000 }),
        createSeat(3, { chipStack: 15 }), // Short stack
      ];

      const { gameState, deck } = startTestHand(engine, seats, 0, 5, 10);
      // Dealer=0, SB=1, BB=2, UTG=3

      let state = gameState;

      // UTG (seat 3) goes all-in with 5 chips left (posted nothing yet, has 15 total,
      // but after being dealt, the startHand doesn't deduct from seat 3)
      // For simplicity, manually set callOnlySeats to simulate the scenario
      state.callOnlySeats = [0, 1, 2];

      // Advance to flop
      const result = engine.advanceStreet(state, deck);
      expect(result.newState.callOnlySeats).toEqual([]);
      expect(result.newState.street).toBe('flop');
    });

    it('heads-up: SB posts first, BB posts second, SB acts first preflop', () => {
      const seats = [
        createSeat(0, { chipStack: 500 }),
        createSeat(3, { chipStack: 500 }),
      ];

      const { gameState, events } = engine.startHand(seats, 0, 5, 10);

      // In heads-up: dealer (seat 0) is SB, other player (seat 3) is BB
      const blindEvents = events.filter(e => e.type === 'post_blind');
      expect(blindEvents).toHaveLength(2);

      // SB posts first
      expect(blindEvents[0]).toMatchObject({
        seatNumber: 0,
        amount: 5,
        blindType: 'small',
      });

      // BB posts second
      expect(blindEvents[1]).toMatchObject({
        seatNumber: 3,
        amount: 10,
        blindType: 'big',
      });

      // SB acts first preflop in heads-up
      expect(gameState.currentSeat).toBe(0);

      // Verify chip deductions
      expect(gameState.seats![0]!.betInRound).toBe(5);
      expect(gameState.seats![0]!.chipStack).toBe(495);
      expect(gameState.seats![3]!.betInRound).toBe(10);
      expect(gameState.seats![3]!.chipStack).toBe(490);
    });

    it('all players all-in except one: shouldSkipToShowdown after action', () => {
      // 4 players: 3 are all-in, 1 can act. Should skip to showdown.
      const seats: (SeatState | null)[] = new Array(6).fill(null);
      seats[0] = createSeat(0, { chipStack: 500, betInRound: 100, totalBetInHand: 100 });
      seats[1] = createSeat(1, { chipStack: 0, isAllIn: true, betInRound: 100, totalBetInHand: 100 });
      seats[2] = createSeat(2, { chipStack: 0, isAllIn: true, betInRound: 50, totalBetInHand: 50 });
      seats[3] = createSeat(3, { chipStack: 0, isAllIn: true, betInRound: 100, totalBetInHand: 100 });

      const state = createGameState({
        seats,
        currentSeat: 0,
        currentBet: 100,
        pot: 350,
        street: 'flop',
      });

      // Seat 0 is the only one who can act
      expect(engine.shouldSkipToShowdown(state)).toBe(true);

      // After seat 0 checks or acts, should still skip to showdown
      const r = applyAndMerge(engine, state, 0, { action: 'check' });
      expect(engine.shouldSkipToShowdown(r.state)).toBe(true);
    });

    it('3-way pot with different stack sizes: side pot distribution', () => {
      // Player 0: all-in 30, Player 1: all-in 80, Player 2: calls 80
      const seats = [
        createSeat(0, { totalBetInHand: 30, chipStack: 0, isAllIn: true }),
        createSeat(1, { totalBetInHand: 80, chipStack: 0, isAllIn: true }),
        createSeat(2, { totalBetInHand: 80, chipStack: 920 }),
      ];

      const pots = engine.calculatePots(seats);

      // Should have 2 pots (not 3, because seats 1 and 2 have same bet)
      expect(pots).toHaveLength(2);

      // Main pot: min(30,30)*3 = 90, all 3 eligible
      expect(pots[0].amount).toBe(90);
      expect(pots[0].eligibleSeats).toEqual(expect.arrayContaining([0, 1, 2]));

      // Side pot: (80-30)*2 = 100, only seats 1 and 2
      expect(pots[1].amount).toBe(100);
      expect(pots[1].eligibleSeats).toEqual(expect.arrayContaining([1, 2]));
      expect(pots[1].eligibleSeats).not.toContain(0);

      // Total distributed = 90 + 100 = 190 = 30 + 80 + 80
      expect(pots[0].amount + pots[1].amount).toBe(190);
    });

    it('3-way pot with 3 different all-in amounts', () => {
      // Player 0: 20, Player 1: 50, Player 2: 100
      const seats = [
        createSeat(0, { totalBetInHand: 20, chipStack: 0, isAllIn: true }),
        createSeat(1, { totalBetInHand: 50, chipStack: 0, isAllIn: true }),
        createSeat(2, { totalBetInHand: 100, chipStack: 900 }),
      ];

      const pots = engine.calculatePots(seats);

      expect(pots).toHaveLength(3);

      // Main pot: 20 * 3 = 60
      expect(pots[0].amount).toBe(60);
      expect(pots[0].eligibleSeats).toEqual(expect.arrayContaining([0, 1, 2]));

      // Side pot 1: (50-20) * 2 = 60
      expect(pots[1].amount).toBe(60);
      expect(pots[1].eligibleSeats).toEqual(expect.arrayContaining([1, 2]));
      expect(pots[1].eligibleSeats).not.toContain(0);

      // Side pot 2: (100-50) * 1 = 50
      expect(pots[2].amount).toBe(50);
      expect(pots[2].eligibleSeats).toEqual([2]);

      // Total: 60 + 60 + 50 = 170 = 20 + 50 + 100
      expect(pots[0].amount + pots[1].amount + pots[2].amount).toBe(170);
    });

    it('heads-up postflop: SB acts first, BB acts last (closer)', () => {
      // In heads-up postflop, the non-dealer (BB) should act last.
      const seats = [
        createSeat(0, { chipStack: 490 }),  // Dealer/SB
        createSeat(1, { chipStack: 480 }),  // BB
      ];

      const { gameState, deck } = startTestHand(engine, seats, 0, 5, 10);

      // Complete preflop: SB calls, BB checks
      let state = gameState;
      let r = applyAndMerge(engine, state, 0, { action: 'call' });
      state = r.state;
      r = applyAndMerge(engine, state, 1, { action: 'check' });
      state = r.state;
      expect(state.currentSeat).toBe(null); // Preflop complete

      // Advance to flop
      const flopResult = engine.advanceStreet(state, deck);
      const flopState: GameState = { ...state, ...flopResult.newState } as GameState;

      // Postflop: first to act is left of dealer = seat 1 (BB) in heads-up?
      // Actually in heads-up: dealer=SB=seat0. First to act postflop = left of dealer = seat 1.
      // But wait - in standard poker, postflop the non-dealer acts first (BB position).
      // In heads-up, dealer is SB (seat 0), so first to act postflop is seat 1 (BB).
      expect(flopState.currentSeat).toBe(1);
    });

    it('fold everyone to BB preflop: BB wins pot without acting', () => {
      const seats = [
        createSeat(0, { chipStack: 1000 }),
        createSeat(1, { chipStack: 1000 }),
        createSeat(2, { chipStack: 1000 }),
      ];

      const { gameState } = startTestHand(engine, seats, 0, 5, 10);
      // Dealer=0, SB=1, BB=2, firstToAct=0

      let state = gameState;

      // UTG (seat 0) folds
      let r = applyAndMerge(engine, state, 0, { action: 'fold' });
      state = r.state;
      expect(r.isHandComplete).toBe(false);

      // SB (seat 1) folds -> only BB left
      r = applyAndMerge(engine, state, 1, { action: 'fold' });
      state = r.state;
      expect(r.isHandComplete).toBe(true);

      // BB should win the pot
      const potEvent = r.events.find(e => e.type === 'pot_awarded');
      expect(potEvent).toBeDefined();
      expect(potEvent!.seatNumber).toBe(2);
    });

    it('raise war: 3-bet, 4-bet, 5-bet sequence tracks minRaise correctly', () => {
      const seats = [
        createSeat(0, { chipStack: 5000 }),
        createSeat(1, { chipStack: 5000 }),
        createSeat(2, { chipStack: 5000 }),
      ];

      const { gameState } = startTestHand(engine, seats, 0, 5, 10);
      // Dealer=0, SB=1, BB=2, firstToAct=0

      let state = gameState;

      // UTG (seat 0) raises to 30 (3x open)
      let r = applyAndMerge(engine, state, 0, { action: 'raise', amount: 30 });
      state = r.state;
      expect(state.currentBet).toBe(30);
      expect(state.minRaise).toBe(20); // raiseSize = 30-10 = 20

      // SB (seat 1) 3-bets to 90 (raise of 60 over 30)
      r = applyAndMerge(engine, state, 1, { action: 'raise', amount: 90 });
      state = r.state;
      expect(state.currentBet).toBe(90);
      expect(state.minRaise).toBe(60); // raiseSize = 90-30 = 60

      // BB (seat 2) 4-bets to 250 (raise of 160 over 90)
      r = applyAndMerge(engine, state, 2, { action: 'raise', amount: 250 });
      state = r.state;
      expect(state.currentBet).toBe(250);
      expect(state.minRaise).toBe(160); // raiseSize = 250-90 = 160

      // UTG 5-bets to 600 (raise of 350 over 250)
      r = applyAndMerge(engine, state, 0, { action: 'raise', amount: 600 });
      state = r.state;
      expect(state.currentBet).toBe(600);
      expect(state.minRaise).toBe(350); // raiseSize = 600-250 = 350

      // Min raise for next player would be 600 + 350 = 950
      const minRaiseTotal = state.currentBet + state.minRaise;
      expect(minRaiseTotal).toBe(950);
    });
  });
});
