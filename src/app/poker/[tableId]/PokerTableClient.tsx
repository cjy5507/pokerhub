'use client';

import type { GameState } from '@/lib/poker/types';
import { usePokerTable } from './usePokerTable';
import { PokerTableHeader } from './components/PokerTableHeader';
import { PokerTableFelt } from './components/PokerTableFelt';
import { PokerHeroPanel } from './components/PokerHeroPanel';
import { BuyInModal } from './components/PokerBuyInModal';
import { HandHistorySheet } from './components/PokerHandHistory';

interface PokerTableClientProps {
  tableId: string;
  initialState: GameState;
  userId: string | null;
  nickname: string | null;
}

export function PokerTableClient({ tableId, initialState, userId, nickname }: PokerTableClientProps) {
  const {
    gameState, actionLog, lastActions, showHistory, setShowHistory,
    isMuted, setIsMuted, buyInModal, setBuyInModal,
    isLeaving, actionPending, lastCompletedHandId,
    raiseAmount, setRaiseAmount, showRaiseSlider, setShowRaiseSlider,
    betInputEditing, setBetInputEditing, betInputText, setBetInputText,
    preAction, setPreAction, potBounce, winOverlay, newCardsDealt, turnTimeLeft,
    seats, heroSeatIndex, heroSeat, isSeated, isHeroTurn, isPlaying, isShowdown,
    maxSeats, seatPositions, betPositions, minBuyIn, maxBuyIn,
    callAmount, canCheck, minRaiseTotal, maxRaiseTotal, pot, bigBlind, betPresets,
    newCardStartIndex,
    handleSitDown, handleBuyInConfirm, handleLeave, handleAction,
  } = usePokerTable(tableId, initialState, userId, nickname);

  return (
    <div className="h-[100dvh] w-[100dvw] bg-op-background flex flex-col overflow-hidden select-none relative">

      <PokerTableHeader
        gameState={gameState}
        seats={seats}
        maxSeats={maxSeats}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        isSeated={isSeated}
        isLeaving={isLeaving}
        onLeave={handleLeave}
        onShowHistory={() => setShowHistory(true)}
      />

      <PokerTableFelt
        gameState={gameState}
        seatPositions={seatPositions}
        betPositions={betPositions}
        maxSeats={maxSeats}
        isPlaying={isPlaying}
        isShowdown={isShowdown}
        turnTimeLeft={turnTimeLeft}
        lastActions={lastActions}
        newCardsDealt={newCardsDealt}
        winOverlay={winOverlay}
        potBounce={potBounce}
        newCardStartIndex={newCardStartIndex}
        heroSeatIndex={heroSeatIndex}
        onSitDown={handleSitDown}
      />

      <PokerHeroPanel
        isSeated={isSeated}
        heroSeat={heroSeat}
        isHeroTurn={isHeroTurn}
        isPlaying={isPlaying}
        turnTimeLeft={turnTimeLeft}
        gameState={gameState}
        seats={seats}
        actionPending={actionPending}
        canCheck={canCheck}
        callAmount={callAmount}
        showRaiseSlider={showRaiseSlider}
        setShowRaiseSlider={setShowRaiseSlider}
        raiseAmount={raiseAmount}
        setRaiseAmount={setRaiseAmount}
        betPresets={betPresets}
        minRaiseTotal={minRaiseTotal}
        maxRaiseTotal={maxRaiseTotal}
        bigBlind={bigBlind}
        pot={pot}
        betInputEditing={betInputEditing}
        setBetInputEditing={setBetInputEditing}
        betInputText={betInputText}
        setBetInputText={setBetInputText}
        preAction={preAction}
        setPreAction={setPreAction}
        onAction={handleAction}
        onLeave={handleLeave}
        isLeaving={isLeaving}
        userId={userId}
        onShowHistory={() => setShowHistory(true)}
      />

      {buyInModal !== null && (
        <BuyInModal
          seatNumber={buyInModal}
          minBuyIn={minBuyIn}
          maxBuyIn={maxBuyIn}
          onConfirm={handleBuyInConfirm}
          onCancel={() => setBuyInModal(null)}
        />
      )}

      <HandHistorySheet
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        actionLog={actionLog}
        lastCompletedHandId={lastCompletedHandId}
        isSeated={isSeated}
      />
    </div>
  );
}
