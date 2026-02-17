# Poker Game Server Implementation

## Files Created

### 1. `/src/lib/poker/gameLoop.ts`
Main game loop logic that orchestrates poker game flow:

**Key Functions:**
- `processAction(tableId, userId, action, amount?)` - Main entry point for all player actions
  - Validates action using PokerEngine
  - Updates DB in transaction
  - Handles street advancement
  - Triggers showdown resolution
  - Auto-starts next hand when complete

- `startNewHand(tableId)` - Starts a new poker hand
  - Posts blinds
  - Deals hole cards
  - Creates DB records (pokerGameHands, pokerGameResults, pokerGameActions)
  - Updates seat chip stacks

**Implementation Details:**
- Uses DB transactions for atomicity
- Reconstructs game state from DB records
- Handles betting rounds and street transitions
- Calculates winners using PokerEngine.resolveShowdown()

### 2. `/src/app/api/poker/[tableId]/route.ts`
Server-Sent Events (SSE) endpoint for real-time updates:

**Features:**
- Polls DB every 1 second for state changes
- Sends updates only when state changes (efficient)
- Tracks: handId, street, actionCount
- Broadcasts full game state on changes
- Sends heartbeat when no changes

**Event Types:**
- `connected` - Initial connection
- `game_state` - Full game state update (seats, hand, actions)
- `heartbeat` - Keep-alive ping
- `error` - Error messages

**State Tracking:**
```typescript
type HandState = {
  handId: string | null;
  handNumber: number;
  street: string | null;
  actionCount: number;
};
```

## Files Updated

### 3. `/src/app/poker/actions.ts`
Added server actions for game operations:

**New Functions:**
- `joinTable(tableId, seatNumber, buyIn)` 
  - Validates seat availability and buy-in range
  - Deducts points atomically
  - Auto-starts hand if 2+ players seated
  
- `leaveTable(tableId)`
  - Returns chips to user points
  - Pauses table if <2 players remain
  
- `getTableState(tableId)`
  - Returns full game state
  - Includes current hand, seats, actions
  - Hides opponent hole cards (shows only to owner or after showdown)
  
- `performAction(tableId, action, amount?)`
  - Delegates to gameLoop.processAction()
  - Auto-starts next hand 3 seconds after completion

**Key Features:**
- All point operations use DB transactions
- Atomic updates prevent race conditions
- Proper error handling with try/catch

## Database Flow

### Join Table Flow
```
1. Validate table exists, seat empty, buy-in in range
2. Deduct points from user (atomic)
3. Insert pokerTableSeats record
4. If 2+ active players → call startNewHand()
```

### Start Hand Flow
```
1. Load active seats
2. Determine dealer, SB, BB positions
3. Use PokerEngine.startHand() to deal cards and post blinds
4. Create pokerGameHands record
5. Insert pokerGameResults (hole cards, chipChange=0)
6. Insert pokerGameActions (post_sb, post_bb)
7. Update seat chip stacks
8. Set table.currentHandId and status='playing'
```

### Perform Action Flow
```
1. Load current game state from DB
2. Validate action using PokerEngine.validateAction()
3. Apply action using PokerEngine.applyAction()
4. Save action to pokerGameActions
5. Update pokerGameHands (pot, currentBet, currentSeat, etc.)
6. Update seat chip stacks
7. If hand complete:
   - Resolve showdown
   - Update pokerGameResults (chipChange, isWinner, handRank)
   - Distribute winnings
   - Mark hand as complete
   - Auto-start next hand after 3s
8. If betting round complete:
   - Advance street using PokerEngine.advanceStreet()
   - Deal community cards
   - Update pokerGameHands
```

### SSE Update Flow
```
1. Poll DB every 1 second
2. Compare current state with last sent state
3. If changed:
   - Load full game state (table, seats, hand, actions)
   - Broadcast game_state event
4. If no change:
   - Send heartbeat event
```

## Key Design Decisions

### 1. Polling vs WebSockets
**Choice:** Server-Sent Events (SSE) with 1-second polling
- Simpler than WebSockets (no bidirectional connection needed)
- Efficient: only sends updates on state changes
- Works with serverless (stateless)

### 2. Transaction Safety
All point operations use `db.transaction(async (tx: any) => {...})`
- Prevents race conditions
- Ensures atomic point deduction/addition
- Rollback on error

### 3. State Reconstruction
Game state is rebuilt from DB records on each action:
- pokerGameHands: pot, currentBet, street, currentSeat
- pokerGameActions: reconstruct betInRound, totalBetInHand
- pokerGameResults: hole cards

This ensures consistency even if server restarts.

### 4. Auto-Start Next Hand
After showdown, next hand starts automatically after 3 seconds:
```typescript
setTimeout(() => {
  startHand(tableId).catch(console.error);
}, 3000);
```

### 5. Hole Card Privacy
Hole cards are hidden by default:
```typescript
if (
  session?.userId === seat.userId ||
  hand.status === 'complete' ||
  hand.status === 'showdown'
) {
  seatState.holeCards = result.holeCards;
}
```

## Testing Recommendations

1. **Join/Leave:**
   - Join with insufficient points → error
   - Join occupied seat → error
   - Join with valid buy-in → success
   - Leave table → chips returned

2. **Hand Start:**
   - 1 player seated → no hand starts
   - 2 players seated → hand auto-starts
   - Blinds posted correctly
   - Hole cards dealt

3. **Actions:**
   - Out of turn → error
   - Invalid action (check when bet exists) → error
   - Valid action → state updates
   - Betting round complete → street advances
   - Hand complete → showdown resolves, next hand starts

4. **SSE:**
   - Connect to `/api/poker/[tableId]`
   - Verify heartbeat every 1s
   - Perform action → verify game_state event
   - Community cards dealt → verify update

## Next Steps

To complete the poker game:

1. **Frontend Client:** Create PokerTableClient component
   - Connect to SSE endpoint
   - Display seats, cards, pot
   - Action buttons (fold, check, call, bet, raise)
   
2. **Error Handling:** Add user-friendly error messages

3. **Disconnection Handling:** Mark players as sitting out after timeout

4. **Rake/Fees:** Deduct rake from pots (optional)

5. **Hand History:** Save completed hands for review

6. **Multi-table Support:** Test with multiple concurrent tables

7. **Performance:** Add DB indexes on frequently queried columns
