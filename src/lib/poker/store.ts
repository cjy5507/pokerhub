import { create } from 'zustand';
import { GameState, Card, PlayerAction } from './types';

interface PokerStore {
  // State
  gameState: GameState | null;
  myCards: Card[] | null;
  mySeat: number | null;
  isMyTurn: boolean;
  turnTimer: number; // seconds left
  handHistory: string[]; // text log of actions
  isConnected: boolean;
  isJoining: boolean;
  isActing: boolean;
  error: string | null;

  // Actions
  setGameState: (state: GameState) => void;
  setMyCards: (cards: Card[] | null) => void;
  setMySeat: (seat: number | null) => void;
  setTurnTimer: (seconds: number) => void;
  addToHistory: (entry: string) => void;
  clearHistory: () => void;
  setConnected: (connected: boolean) => void;
  setJoining: (joining: boolean) => void;
  setActing: (acting: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const usePokerStore = create<PokerStore>((set) => ({
  // Initial state
  gameState: null,
  myCards: null,
  mySeat: null,
  isMyTurn: false,
  turnTimer: 0,
  handHistory: [],
  isConnected: false,
  isJoining: false,
  isActing: false,
  error: null,

  // Actions
  setGameState: (gameState) =>
    set((state) => {
      const isMyTurn =
        state.mySeat !== null && gameState.currentSeat === state.mySeat;
      return { gameState, isMyTurn };
    }),

  setMyCards: (myCards) => set({ myCards }),

  setMySeat: (mySeat) => set({ mySeat }),

  setTurnTimer: (turnTimer) => set({ turnTimer }),

  addToHistory: (entry) =>
    set((state) => ({
      handHistory: [...state.handHistory, entry],
    })),

  clearHistory: () => set({ handHistory: [] }),

  setConnected: (isConnected) => set({ isConnected }),

  setJoining: (isJoining) => set({ isJoining }),

  setActing: (isActing) => set({ isActing }),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      gameState: null,
      myCards: null,
      mySeat: null,
      isMyTurn: false,
      turnTimer: 0,
      handHistory: [],
      isConnected: false,
      isJoining: false,
      isActing: false,
      error: null,
    }),
}));
