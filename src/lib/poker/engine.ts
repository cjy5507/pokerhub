import { Deck } from './deck';
import { determineWinners, findBestHand } from './evaluator';
import {
  ActionRequest,
  ActionValidation,
  Card,
  GameEvent,
  GameState,
  GameStreet,
  PlayerAction,
  SeatState,
} from './types';

// ── Helpers ─────────────────────────────────────────────────────────

/** Get all non-null, non-folded, non-sitting-out seats */
function activePlayers(seats: (SeatState | null)[]): SeatState[] {
  return seats.filter(
    (s): s is SeatState => s !== null && !s.isFolded && !s.isSittingOut && s.isActive
  );
}

/** Get all non-null, non-folded, non-sitting-out, non-all-in seats (can still act) */
function actingPlayers(seats: (SeatState | null)[]): SeatState[] {
  return activePlayers(seats).filter((s) => !s.isAllIn);
}

/** Count occupied seats (non-null, active, not sitting out) */
function occupiedSeats(seats: (SeatState | null)[]): SeatState[] {
  return seats.filter(
    (s): s is SeatState => s != null && s.isActive && !s.isSittingOut
  );
}

/** Advance seat index wrapping around, returning the next seat matching the filter */
function nextOccupiedSeat(
  seats: (SeatState | null)[],
  from: number,
  filter: (s: SeatState) => boolean
): number | null {
  const len = seats.length;
  for (let i = 1; i <= len; i++) {
    const idx = (from + i) % len;
    const seat = seats[idx];
    if (seat != null && filter(seat)) {
      return idx;
    }
  }
  return null;
}

// ── PokerEngine ─────────────────────────────────────────────────────

/**
 * Action-closing model:
 *
 * `actionClosedBySeat` tracks the seat whose action ends the betting round.
 * When this player acts (check, call, or fold) with all bets matched, the
 * round is over. If they raise, the closer moves to the seat before them.
 *
 * - Preflop start: closer = BB (BB option).
 * - After bet/raise by seat X: closer = seat X (everyone else must respond,
 *   and when action returns to the raiser, round is over -- but the raiser
 *   doesn't act again, so effectively the last player before X closes it).
 *   We handle this by setting closer to the acting player themselves after
 *   aggressive action, since the engine skips back to them.
 * - New postflop street: closer = the seat before the first-to-act (the
 *   last player in clockwise order who can act).
 */

export class PokerEngine {
  /**
   * Start a new hand: post blinds, deal hole cards, set state to preflop.
   */
  startHand(
    seats: SeatState[],
    dealerSeat: number,
    smallBlind: number,
    bigBlind: number
  ): {
    deck: Deck;
    holeCards: Map<number, Card[]>;
    gameState: Partial<GameState>;
    events: GameEvent[];
  } {
    const deck = new Deck();
    const events: GameEvent[] = [];
    // Array size must accommodate the highest seat number, not just the count of active players
    const maxSeatNum = Math.max(...seats.map(s => s.seatNumber)) + 1;

    // Build full seats array (index = seat number)
    const seatArray: (SeatState | null)[] = new Array(maxSeatNum).fill(null);
    for (const seat of seats) {
      seatArray[seat.seatNumber] = {
        ...seat,
        betInRound: 0,
        totalBetInHand: 0,
        isFolded: false,
        isAllIn: false,
        holeCards: null,
      };
    }

    const active = occupiedSeats(seatArray);
    if (active.length < 2) {
      throw new Error('Need at least 2 active players to start a hand');
    }

    const isHeadsUp = active.length === 2;

    // ── Determine blind positions ─────────────────────────────
    let sbSeat: number;
    let bbSeat: number;

    if (isHeadsUp) {
      sbSeat = dealerSeat;
      bbSeat = nextOccupiedSeat(seatArray, dealerSeat, (s) => s.isActive && !s.isSittingOut)!;
    } else {
      sbSeat = nextOccupiedSeat(seatArray, dealerSeat, (s) => s.isActive && !s.isSittingOut)!;
      bbSeat = nextOccupiedSeat(seatArray, sbSeat, (s) => s.isActive && !s.isSittingOut)!;
    }

    events.push({ type: 'new_hand', handNumber: 0, dealerSeat });

    // ── Post blinds ───────────────────────────────────────────
    const postBlind = (seatIdx: number, amount: number, blindType: 'small' | 'big') => {
      const seat = seatArray[seatIdx]!;
      const posted = Math.min(amount, seat.chipStack);
      seat.chipStack -= posted;
      seat.betInRound = posted;
      seat.totalBetInHand = posted;
      if (seat.chipStack === 0) {
        seat.isAllIn = true;
      }
      events.push({ type: 'post_blind', seatNumber: seatIdx, amount: posted, blindType });
    };

    postBlind(sbSeat, smallBlind, 'small');
    postBlind(bbSeat, bigBlind, 'big');

    const totalPot = seatArray[sbSeat]!.betInRound + seatArray[bbSeat]!.betInRound;

    // ── Deal hole cards ───────────────────────────────────────
    const holeCards = new Map<number, Card[]>();

    let dealStart = nextOccupiedSeat(seatArray, dealerSeat, (s) => s.isActive && !s.isSittingOut)!;
    const dealOrder: number[] = [];
    let current = dealStart;
    do {
      dealOrder.push(current);
      current = nextOccupiedSeat(seatArray, current, (s) => s.isActive && !s.isSittingOut)!;
    } while (current !== dealStart);

    for (const seatIdx of dealOrder) {
      const cards = deck.deal(2);
      holeCards.set(seatIdx, cards);
      seatArray[seatIdx]!.holeCards = cards;
      events.push({ type: 'deal_cards', seatNumber: seatIdx, cards });
    }

    // ── Determine first to act preflop ────────────────────────
    let firstToAct: number | null;
    if (isHeadsUp) {
      firstToAct = sbSeat;
    } else {
      firstToAct = nextOccupiedSeat(seatArray, bbSeat, (s) => s.isActive && !s.isSittingOut && !s.isAllIn);
    }

    // Preflop: action closes at BB (BB has the option to check or raise)
    const actionClosedBySeat = bbSeat;

    const gameState: Partial<GameState> = {
      street: 'preflop',
      communityCards: [],
      pot: totalPot,
      sidePots: [],
      currentSeat: firstToAct,
      currentBet: bigBlind,
      minRaise: bigBlind,
      dealerSeat,
      seats: seatArray,
      lastAction: null,
      actionClosedBySeat,
      closerHasActed: false,
      status: 'playing',
    };

    return { deck, holeCards, gameState, events };
  }

  /**
   * Validate if an action is legal given the current game state.
   */
  validateAction(
    state: GameState,
    seatNumber: number,
    action: ActionRequest
  ): ActionValidation {
    const seat = state.seats[seatNumber];
    if (!seat) {
      return { valid: false, error: 'Seat is empty' };
    }
    if (state.currentSeat !== seatNumber) {
      return { valid: false, error: 'Not your turn' };
    }
    if (seat.isFolded) {
      return { valid: false, error: 'Player has folded' };
    }
    if (seat.isAllIn) {
      return { valid: false, error: 'Player is all-in' };
    }
    if (!seat.isActive || seat.isSittingOut) {
      return { valid: false, error: 'Player is not active' };
    }

    const callAmount = state.currentBet - seat.betInRound;
    const canCheck = callAmount === 0;
    const chipStack = seat.chipStack;

    switch (action.action) {
      case 'fold':
        return { valid: true, callAmount };

      case 'check':
        if (!canCheck) {
          return {
            valid: false,
            error: `Must call ${callAmount} or fold`,
            callAmount,
          };
        }
        return { valid: true, callAmount: 0 };

      case 'call':
        if (canCheck) {
          return { valid: false, error: 'No bet to call, use check' };
        }
        return { valid: true, callAmount: Math.min(callAmount, chipStack) };

      case 'bet': {
        if (!canCheck) {
          return {
            valid: false,
            error: 'There is already a bet, use raise',
            callAmount,
          };
        }
        const betAmount = action.amount ?? 0;
        const minBet = state.bigBlind;
        if (betAmount < minBet && betAmount < chipStack) {
          return {
            valid: false,
            error: `Minimum bet is ${minBet}`,
            minBet,
            maxBet: chipStack,
          };
        }
        if (betAmount > chipStack) {
          return {
            valid: false,
            error: `Cannot bet more than chip stack (${chipStack})`,
            minBet,
            maxBet: chipStack,
          };
        }
        return { valid: true, minBet, maxBet: chipStack };
      }

      case 'raise': {
        if (canCheck) {
          return { valid: false, error: 'No bet to raise, use bet' };
        }
        const raiseAmount = action.amount ?? 0;
        const totalNeeded = raiseAmount - seat.betInRound;
        const minRaiseTotal = state.currentBet + state.minRaise;

        if (raiseAmount < minRaiseTotal && totalNeeded < chipStack) {
          return {
            valid: false,
            error: `Minimum raise to ${minRaiseTotal}`,
            minBet: minRaiseTotal,
            maxBet: seat.betInRound + chipStack,
            callAmount,
          };
        }
        if (totalNeeded > chipStack) {
          return {
            valid: false,
            error: `Cannot raise, need ${totalNeeded} but only have ${chipStack}`,
            minBet: minRaiseTotal,
            maxBet: seat.betInRound + chipStack,
            callAmount,
          };
        }
        return {
          valid: true,
          minBet: minRaiseTotal,
          maxBet: seat.betInRound + chipStack,
          callAmount,
        };
      }

      case 'all_in':
        if (chipStack === 0) {
          return { valid: false, error: 'No chips to go all-in with' };
        }
        return { valid: true, callAmount };

      default:
        return { valid: false, error: `Unknown action: ${action.action}` };
    }
  }

  /**
   * Apply a validated action and return updated state + events.
   */
  applyAction(
    state: GameState,
    seatNumber: number,
    action: ActionRequest
  ): {
    newState: Partial<GameState>;
    events: GameEvent[];
    isHandComplete: boolean;
  } {
    const events: GameEvent[] = [];
    const seats = state.seats.map((s) => (s ? { ...s } : null));
    const seat = seats[seatNumber]!;

    let currentBet = state.currentBet;
    let minRaise = state.minRaise;
    let pot = state.pot;
    let isAggressive = false;
    let actionClosedBySeat = state.actionClosedBySeat;
    let closerHasActed = state.closerHasActed ?? true;

    // If the closer is acting now (passive action), mark them as having acted
    if (seatNumber === actionClosedBySeat) {
      closerHasActed = true;
    }

    switch (action.action) {
      case 'fold': {
        seat.isFolded = true;
        events.push({
          type: 'player_action',
          seatNumber,
          action: 'fold',
          amount: 0,
        });

        // If the closer folded, move closer to next active player after them
        if (actionClosedBySeat === seatNumber) {
          actionClosedBySeat = nextOccupiedSeat(
            seats,
            seatNumber,
            (s) => !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut
          );
          closerHasActed = true; // New closer already acted earlier in this round
        }
        break;
      }

      case 'check': {
        events.push({
          type: 'player_action',
          seatNumber,
          action: 'check',
          amount: 0,
        });
        break;
      }

      case 'call': {
        const callAmount = Math.min(
          currentBet - seat.betInRound,
          seat.chipStack
        );
        seat.chipStack -= callAmount;
        seat.betInRound += callAmount;
        seat.totalBetInHand += callAmount;
        pot += callAmount;
        if (seat.chipStack === 0) {
          seat.isAllIn = true;
          // If the closer went all-in on a call, move closer forward
          if (actionClosedBySeat === seatNumber) {
            actionClosedBySeat = nextOccupiedSeat(
              seats,
              seatNumber,
              (s) => !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut
            );
            closerHasActed = true; // New closer already acted earlier in this round
          }
        }
        events.push({
          type: 'player_action',
          seatNumber,
          action: 'call',
          amount: callAmount,
        });
        break;
      }

      case 'bet': {
        const betAmount = action.amount ?? state.bigBlind;
        seat.chipStack -= betAmount;
        seat.betInRound += betAmount;
        seat.totalBetInHand += betAmount;
        pot += betAmount;
        currentBet = seat.betInRound;
        minRaise = betAmount;
        isAggressive = true;
        if (seat.chipStack === 0) {
          seat.isAllIn = true;
        }
        events.push({
          type: 'player_action',
          seatNumber,
          action: 'bet',
          amount: betAmount,
        });
        // After a bet, action closes when it comes back around to the bettor.
        // Since the bettor has already acted, the "closer" is the bettor themselves.
        actionClosedBySeat = seatNumber;
        closerHasActed = true;
        break;
      }

      case 'raise': {
        const raiseTotal = action.amount ?? currentBet + minRaise;
        const additional = raiseTotal - seat.betInRound;
        const raiseSize = raiseTotal - currentBet;

        seat.chipStack -= additional;
        seat.betInRound = raiseTotal;
        seat.totalBetInHand += additional;
        pot += additional;

        if (raiseSize >= minRaise) {
          minRaise = raiseSize;
        }
        currentBet = raiseTotal;
        isAggressive = true;

        if (seat.chipStack === 0) {
          seat.isAllIn = true;
        }
        events.push({
          type: 'player_action',
          seatNumber,
          action: 'raise',
          amount: raiseTotal,
        });
        // After a raise, action closes at the raiser
        actionClosedBySeat = seatNumber;
        closerHasActed = true;
        break;
      }

      case 'all_in': {
        const allInAmount = seat.chipStack;
        const newBetTotal = seat.betInRound + allInAmount;

        seat.chipStack = 0;
        seat.isAllIn = true;
        pot += allInAmount;

        if (newBetTotal > currentBet) {
          const raiseSize = newBetTotal - currentBet;
          if (raiseSize >= minRaise) {
            minRaise = raiseSize;
            isAggressive = true;
            // Full raise: action must go around again
            actionClosedBySeat = seatNumber;
            closerHasActed = true;
          }
          currentBet = newBetTotal;
        }

        seat.betInRound = newBetTotal;
        seat.totalBetInHand += allInAmount;

        // If the closer went all-in, move closer forward (they can't act anymore)
        if (actionClosedBySeat === seatNumber && !isAggressive) {
          actionClosedBySeat = nextOccupiedSeat(
            seats,
            seatNumber,
            (s) => !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut
          );
          closerHasActed = true; // New closer already acted earlier in this round
        }

        events.push({
          type: 'player_action',
          seatNumber,
          action: 'all_in',
          amount: allInAmount,
        });
        break;
      }
    }

    // ── Check if hand is over (only one non-folded player) ────
    const remaining = activePlayers(seats);
    if (remaining.length === 1) {
      const winner = remaining[0];
      winner.chipStack += pot;
      events.push({
        type: 'pot_awarded',
        seatNumber: winner.seatNumber,
        amount: pot,
      });
      events.push({ type: 'hand_complete' });

      return {
        newState: {
          seats,
          pot: 0,
          currentBet,
          minRaise,
          currentSeat: null,
          lastAction: { seat: seatNumber, action: action.action, amount: action.amount ?? 0 },
          actionClosedBySeat: null,
          street: 'showdown',
          status: 'waiting',
        },
        events,
        isHandComplete: true,
      };
    }

    // ── Determine next player to act ──────────────────────────
    let nextSeat: number | null = null;
    const canAct = actingPlayers(seats);

    if (canAct.length === 0) {
      // No one can act (everyone all-in or folded)
      nextSeat = null;
    } else if (isAggressive) {
      // After bet/raise: next player clockwise who can act
      nextSeat = nextOccupiedSeat(
        seats,
        seatNumber,
        (s) => !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut
      );
    } else if (seatNumber === actionClosedBySeat) {
      // The closer just acted passively (check/call/fold) - round is complete.
      nextSeat = null;
    } else {
      // After passive action: find next player clockwise who can act.
      nextSeat = this.findNextToAct(seats, seatNumber, currentBet, actionClosedBySeat, closerHasActed);
    }

    return {
      newState: {
        seats,
        pot,
        currentBet,
        minRaise,
        currentSeat: nextSeat,
        lastAction: { seat: seatNumber, action: action.action, amount: action.amount ?? 0 },
        actionClosedBySeat,
        closerHasActed,
      },
      events,
      isHandComplete: false,
    };
  }

  /**
   * After a passive action (check/call/fold), find the next player to act.
   * Returns null if the betting round is complete.
   *
   * The round is complete when we reach the `actionClosedBySeat` and they
   * have matched the current bet. The closer is the last player who needs
   * to respond.
   */
  private findNextToAct(
    seats: (SeatState | null)[],
    currentSeat: number,
    currentBet: number,
    actionClosedBySeat: number | null,
    closerHasActed: boolean = true
  ): number | null {
    const len = seats.length;

    for (let i = 1; i <= len; i++) {
      const idx = (currentSeat + i) % len;
      const seat = seats[idx];
      if (
        seat === null ||
        seat.isFolded ||
        seat.isAllIn ||
        !seat.isActive ||
        seat.isSittingOut
      ) {
        // If this was the closer (but they folded/all-in), skip them
        // The closer should have already been updated in applyAction
        continue;
      }

      // This player can act. Do they need to?
      if (seat.betInRound < currentBet) {
        // Yes, they must respond to the bet
        return idx;
      }

      // Their bet matches. Have we completed the orbit?
      // If this player IS the closer and has already acted, the round is over.
      // If the closer hasn't acted yet (e.g., BB option preflop, new postflop street),
      // give them their turn.
      if (idx === actionClosedBySeat) {
        if (closerHasActed) {
          return null; // Closer already acted, round complete
        }
        return idx; // Closer needs their turn (BB option, postflop first round)
      }

      // In a check-around (currentBet === 0), this player hasn't checked yet
      // (they are between currentSeat and the closer). Return them.
      if (currentBet === 0) {
        return idx;
      }

      // currentBet > 0 and this player's bet matches -- they've already called.
      // Continue scanning.
    }

    return null;
  }

  /**
   * Advance to the next street and deal community cards.
   */
  advanceStreet(
    state: GameState,
    deck: Deck
  ): {
    newState: Partial<GameState>;
    newCards: Card[];
    events: GameEvent[];
  } {
    const events: GameEvent[] = [];
    const seats = state.seats.map((s) => (s ? { ...s, betInRound: 0 } : null));

    let newStreet: GameStreet;
    let newCards: Card[] = [];
    const communityCards = [...state.communityCards];

    switch (state.street) {
      case 'preflop':
        newStreet = 'flop';
        newCards = deck.deal(3);
        communityCards.push(...newCards);
        break;
      case 'flop':
        newStreet = 'turn';
        newCards = deck.deal(1);
        communityCards.push(...newCards);
        break;
      case 'turn':
        newStreet = 'river';
        newCards = deck.deal(1);
        communityCards.push(...newCards);
        break;
      case 'river':
        newStreet = 'showdown';
        break;
      default:
        throw new Error(`Cannot advance from street: ${state.street}`);
    }

    events.push({
      type: 'community_cards',
      street: newStreet,
      cards: newCards,
    });

    // First active player left of dealer
    let firstToAct: number | null = null;
    if (newStreet !== 'showdown') {
      firstToAct = nextOccupiedSeat(
        seats,
        state.dealerSeat,
        (s) => !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut
      );
    }

    // The closer for a new street is the last acting player before the first-to-act
    // (i.e., the player just before firstToAct in reverse clockwise order)
    let newCloser: number | null = null;
    if (firstToAct !== null) {
      // Find the last acting player (the one right before firstToAct going clockwise)
      // This is the same as scanning backwards from firstToAct
      const acting = actingPlayers(seats);
      if (acting.length > 0) {
        // Walk backwards from firstToAct
        for (let i = 1; i <= seats.length; i++) {
          const idx = (firstToAct - i + seats.length) % seats.length;
          const s = seats[idx];
          if (s && !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut) {
            newCloser = idx;
            break;
          }
        }
      }
    }

    return {
      newState: {
        street: newStreet,
        communityCards,
        currentBet: 0,
        minRaise: state.bigBlind,
        currentSeat: firstToAct,
        seats,
        lastAction: null,
        actionClosedBySeat: newCloser,
        closerHasActed: false,
      },
      newCards,
      events,
    };
  }

  /**
   * Calculate side pots for all-in situations.
   */
  calculatePots(
    seats: SeatState[]
  ): { amount: number; eligibleSeats: number[] }[] {
    const contributors = seats
      .filter((s) => s.totalBetInHand > 0)
      .sort((a, b) => a.totalBetInHand - b.totalBetInHand);

    if (contributors.length === 0) return [];

    const pots: { amount: number; eligibleSeats: number[] }[] = [];
    let previousLevel = 0;

    const allInLevels = Array.from(
      new Set(
        contributors
          .filter((s) => s.isAllIn)
          .map((s) => s.totalBetInHand)
      )
    ).sort((a, b) => a - b);

    const maxBet = Math.max(...contributors.map((s) => s.totalBetInHand));
    const levels = [...allInLevels];
    if (!levels.includes(maxBet)) {
      levels.push(maxBet);
    }

    for (const level of levels) {
      if (level <= previousLevel) continue;

      let potAmount = 0;
      const eligible: number[] = [];

      for (const c of contributors) {
        const contribution = Math.min(c.totalBetInHand, level) - Math.min(c.totalBetInHand, previousLevel);
        potAmount += contribution;

        if (!c.isFolded && c.totalBetInHand >= level) {
          eligible.push(c.seatNumber);
        }
        if (!c.isFolded && c.isAllIn && c.totalBetInHand === level) {
          if (!eligible.includes(c.seatNumber)) {
            eligible.push(c.seatNumber);
          }
        }
      }

      if (potAmount > 0 && eligible.length > 0) {
        pots.push({ amount: potAmount, eligibleSeats: eligible });
      }

      previousLevel = level;
    }

    return pots;
  }

  /**
   * Determine winners and distribute pots at showdown.
   */
  resolveShowdown(
    state: GameState,
    holeCards: Map<number, Card[]>
  ): {
    winners: { seatNumber: number; amount: number; handRank: string }[];
    results: {
      seatNumber: number;
      chipChange: number;
      holeCards: Card[];
      handRank: string;
    }[];
  } {
    const activeSeats = activePlayers(state.seats);
    const allWinners: { seatNumber: number; amount: number; handRank: string }[] = [];
    const chipChanges = new Map<number, number>();

    for (const seat of state.seats) {
      if (seat !== null) {
        chipChanges.set(seat.seatNumber, -seat.totalBetInHand);
      }
    }

    const pots = this.calculatePots(
      state.seats.filter((s): s is SeatState => s !== null)
    );

    const potsToResolve =
      pots.length > 0
        ? pots
        : [
            {
              amount: state.pot,
              eligibleSeats: activeSeats.map((s) => s.seatNumber),
            },
          ];

    for (const pot of potsToResolve) {
      const eligible = pot.eligibleSeats
        .filter((sn) => {
          const seat = state.seats[sn];
          return seat !== null && !seat.isFolded;
        })
        .map((sn) => ({
          seatNumber: sn,
          holeCards: holeCards.get(sn) || [],
        }))
        .filter((p) => p.holeCards.length === 2);

      if (eligible.length === 0) continue;

      if (eligible.length === 1) {
        const winner = eligible[0];
        const cards = holeCards.get(winner.seatNumber) || [];
        const { rank } = findBestHand(cards, state.communityCards);
        allWinners.push({
          seatNumber: winner.seatNumber,
          amount: pot.amount,
          handRank: rank.name,
        });
        chipChanges.set(
          winner.seatNumber,
          (chipChanges.get(winner.seatNumber) || 0) + pot.amount
        );
        continue;
      }

      const winners = determineWinners(eligible, state.communityCards);
      const share = Math.floor(pot.amount / winners.length);
      const remainder = pot.amount - share * winners.length;

      winners.forEach((w, idx) => {
        const amount = share + (idx === 0 ? remainder : 0);
        allWinners.push({
          seatNumber: w.seatNumber,
          amount,
          handRank: w.rank.name,
        });
        chipChanges.set(
          w.seatNumber,
          (chipChanges.get(w.seatNumber) || 0) + amount
        );
      });
    }

    const results = state.seats
      .filter((s): s is SeatState => s !== null && s.totalBetInHand > 0)
      .map((s) => {
        const cards = holeCards.get(s.seatNumber) || [];
        let handRank = 'Folded';
        if (!s.isFolded && cards.length === 2 && state.communityCards.length >= 3) {
          const { rank } = findBestHand(cards, state.communityCards);
          handRank = rank.name;
        }
        return {
          seatNumber: s.seatNumber,
          chipChange: chipChanges.get(s.seatNumber) || 0,
          holeCards: cards,
          handRank,
        };
      });

    return { winners: allWinners, results };
  }

  /**
   * Get the next active (non-folded, non-all-in) player seat.
   */
  getNextSeat(
    seats: (SeatState | null)[],
    currentSeat: number
  ): number | null {
    return nextOccupiedSeat(
      seats,
      currentSeat,
      (s) => !s.isFolded && !s.isAllIn && s.isActive && !s.isSittingOut
    );
  }

  /**
   * Check if the current betting round is complete.
   */
  isBettingRoundComplete(state: GameState): boolean {
    if (state.currentSeat === null) return true;

    const acting = actingPlayers(state.seats);
    if (acting.length === 0) return true;

    const active = activePlayers(state.seats);
    if (active.length <= 1) return true;

    return false;
  }

  /**
   * Check if the hand should proceed directly to showdown
   * (all remaining players are all-in or at most one can still act).
   */
  shouldSkipToShowdown(state: GameState): boolean {
    const active = activePlayers(state.seats);
    if (active.length <= 1) return false;
    const acting = actingPlayers(state.seats);
    return acting.length <= 1;
  }
}

export type { GameEvent };
