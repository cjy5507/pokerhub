import { useEffect, useCallback, useRef } from 'react';
import { usePokerStore } from './store';
import { GameState } from './types';

interface SSEGameStateMessage {
  type: 'game_state';
  state: GameState;
}

interface SSEHeartbeatMessage {
  type: 'heartbeat';
}

type SSEMessage = SSEGameStateMessage | SSEHeartbeatMessage;

export function usePokerTable(tableId: string, userId: string | null) {
  const store = usePokerStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // SSE Connection
  useEffect(() => {
    if (!tableId) return;

    const connect = () => {
      const es = new EventSource(`/api/poker/${tableId}`);
      eventSourceRef.current = es;

      es.onopen = () => {
        store.setConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data);
          handleEvent(data);
        } catch (err) {
          console.error('Failed to parse SSE message:', err);
        }
      };

      es.onerror = () => {
        store.setConnected(false);
        es.close();
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSourceRef.current?.close();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [tableId]);

  // Handle SSE events
  const handleEvent = useCallback(
    (data: SSEMessage) => {
      switch (data.type) {
        case 'game_state': {
          const gameState = data.state;
          store.setGameState(gameState);

          // Find my seat and cards
          if (userId && gameState.seats) {
            const mySeatIndex = gameState.seats.findIndex(
              (s) => s?.userId === userId
            );
            if (mySeatIndex >= 0) {
              store.setMySeat(mySeatIndex);
              const mySeatData = gameState.seats[mySeatIndex];
              store.setMyCards(mySeatData?.holeCards ?? null);
            }
          }

          // Check if it's my turn
          const mySeat = usePokerStore.getState().mySeat;
          if (mySeat !== null && gameState.currentSeat === mySeat) {
            store.setTurnTimer(30);
            startTurnTimer();
          }
          break;
        }
        case 'heartbeat':
          // Keep connection alive
          break;
      }
    },
    [userId]
  );

  // Turn timer countdown
  const startTurnTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      const current = usePokerStore.getState().turnTimer;
      if (current <= 1) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        // Auto-fold on timeout
        if (usePokerStore.getState().isMyTurn) {
          performAction('fold');
        }
      } else {
        store.setTurnTimer(current - 1);
      }
    }, 1000);
  }, []);

  // Perform game action
  const performAction = useCallback(
    async (action: string, amount?: number) => {
      store.setActing(true);
      store.setError(null);
      try {
        const { performAction: serverAction } = await import(
          '@/app/poker/actions'
        );
        await serverAction(tableId, action as any, amount);
      } catch (err) {
        store.setError(err instanceof Error ? err.message : 'Action failed');
      } finally {
        store.setActing(false);
      }
    },
    [tableId]
  );

  // Join table
  const joinTable = useCallback(
    async (seatNumber: number, buyIn: number) => {
      store.setJoining(true);
      store.setError(null);
      try {
        const { joinTable: serverJoin } = await import('@/app/poker/actions');
        const result = await serverJoin(tableId, seatNumber, buyIn);
        if (!result.success) {
          store.setError(result.error || 'Join failed');
        } else {
          store.setMySeat(seatNumber);
        }
      } catch (err) {
        store.setError('Network error');
      } finally {
        store.setJoining(false);
      }
    },
    [tableId]
  );

  // Leave table
  const leaveTable = useCallback(async () => {
    try {
      const { leaveTable: serverLeave } = await import('@/app/poker/actions');
      await serverLeave(tableId);
      store.setMySeat(null);
      store.setMyCards(null);
    } catch (err) {
      console.error('Failed to leave table:', err);
    }
  }, [tableId]);

  return {
    // State
    gameState: store.gameState,
    myCards: store.myCards,
    mySeat: store.mySeat,
    isMyTurn: store.isMyTurn,
    turnTimer: store.turnTimer,
    handHistory: store.handHistory,
    isConnected: store.isConnected,
    isJoining: store.isJoining,
    isActing: store.isActing,
    error: store.error,

    // Actions
    performAction,
    joinTable,
    leaveTable,
  };
}
