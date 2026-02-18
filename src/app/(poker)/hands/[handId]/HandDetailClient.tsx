'use client';

import { useState } from 'react';
import { PokerHand } from '@/types/poker';
import { Heart, MessageSquare, Eye, Play, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StreetNavigator, type StreetData } from '@/components/poker/StreetNavigator';
import { HandReplayer } from '@/components/poker/HandReplayer';

interface HandDetailClientProps {
  hand: PokerHand;
}

// ─── Card renderer ────────────────────────────────────────────────

function CardDisplay({ card }: { card: string }) {
  const suit = card.slice(-1);
  const rank = card.slice(0, -1);
  const isRed = suit === 'h' || suit === 'd';
  const suitSymbol = { h: '♥', d: '♦', c: '♣', s: '♠' }[suit] ?? suit;

  return (
    <span
      className="inline-flex items-center justify-center w-10 h-14 bg-white rounded-md border border-gray-200 font-bold text-base leading-none select-none shadow-sm"
      style={{ color: isRed ? '#ef4444' : '#111' }}
    >
      <span className="flex flex-col items-center leading-none gap-0.5">
        <span className="text-sm">{rank}</span>
        <span className="text-xs">{suitSymbol}</span>
      </span>
    </span>
  );
}

// ─── Build StreetNavigator data from hand actions ─────────────────

function buildStreetData(hand: PokerHand): StreetData[] {
  const streets: StreetData['street'][] = ['preflop', 'flop', 'turn', 'river'];
  const result: StreetData[] = [];

  for (const street of streets) {
    const streetActions = (hand.actions ?? []).filter(a => a.street === street);
    if (streetActions.length === 0) continue;
    result.push({
      street,
      actions: streetActions.map(a => ({
        position: a.position.toUpperCase(),
        type: a.action as any,
        amount: a.amount,
      })),
    });
  }

  return result;
}

// ─── Build HandReplayer data ──────────────────────────────────────

function buildReplayerPlayers(hand: PokerHand) {
  return (hand.players ?? []).map(p => ({
    position: p.position,
    stackSize: p.stackSize,
    cards: p.cards?.join(' '),
    isHero: p.isHero,
  }));
}

function buildReplayerActions(hand: PokerHand) {
  return (hand.actions ?? []).map((a, i) => ({
    street: a.street,
    sequence: a.sequence ?? i + 1,
    position: a.position,
    action: a.action,
    amount: a.amount,
  }));
}

// ─── Main component ───────────────────────────────────────────────

export function HandDetailClient({ hand }: HandDetailClientProps) {
  const [view, setView] = useState<'analysis' | 'replay'>('analysis');

  const streetData = buildStreetData(hand);
  const replayerPlayers = buildReplayerPlayers(hand);
  const replayerActions = buildReplayerActions(hand);

  const boardFlopStr = hand.boardFlop?.join(' ');
  const boardTurnStr = hand.boardTurn;
  const boardRiverStr = hand.boardRiver;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

      {/* ── Header card ─────────────────────────────────────── */}
      <div className="bg-ph-elevated rounded-xl p-5 border border-ph-border">
        <div className="flex items-center justify-between mb-4">
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-ph-gold flex items-center justify-center text-ph-text-inverse font-bold text-sm">
              {hand.authorNickname?.charAt(0)?.toUpperCase() ?? 'P'}
            </div>
            <div>
              <div className="text-ph-text font-semibold text-sm">{hand.authorNickname ?? '익명'}</div>
              <div className="text-xs text-ph-text-muted">Lv {hand.authorLevel ?? 1}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-ph-text-muted">
            <div className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              <span>{hand.likeCount ?? 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{hand.commentCount ?? 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{hand.viewCount ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Meta info grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: '게임', value: hand.gameType?.toUpperCase() ?? 'NLHE' },
            { label: '테이블', value: hand.tableSize ?? '-' },
            { label: '스테이크', value: hand.stakes ?? '-' },
            { label: '포지션', value: hand.heroPosition?.toUpperCase() ?? '-' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-ph-surface rounded-lg px-3 py-2">
              <div className="text-ph-text-muted mb-0.5">{label}</div>
              <div className="text-ph-text font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Hand info card ───────────────────────────────────── */}
      <div className="bg-ph-elevated rounded-xl p-5 border border-ph-border space-y-4">
        {/* Hero cards */}
        <div>
          <div className="text-xs text-ph-text-muted mb-2 font-medium">홀 카드</div>
          <div className="flex gap-1.5">
            {(hand.heroCards ?? []).map((card, i) => (
              <CardDisplay key={i} card={card} />
            ))}
          </div>
        </div>

        {/* Board */}
        {hand.boardFlop && (
          <div>
            <div className="text-xs text-ph-text-muted mb-2 font-medium">보드</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {hand.boardFlop.map((card, i) => (
                <CardDisplay key={`f${i}`} card={card} />
              ))}
              {hand.boardTurn && (
                <>
                  <div className="w-2 h-px bg-ph-border" />
                  <CardDisplay card={hand.boardTurn} />
                </>
              )}
              {hand.boardRiver && (
                <>
                  <div className="w-2 h-px bg-ph-border" />
                  <CardDisplay card={hand.boardRiver} />
                </>
              )}
            </div>
          </div>
        )}

        {/* Pot sizes */}
        {(hand.potPreflop !== undefined || hand.potFlop !== undefined ||
          hand.potTurn !== undefined || hand.potRiver !== undefined) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {hand.potPreflop !== undefined && (
              <div className="bg-ph-surface rounded-lg px-3 py-2">
                <div className="text-ph-text-muted mb-0.5">Preflop 팟</div>
                <div className="text-ph-text font-semibold">{hand.potPreflop.toLocaleString()}</div>
              </div>
            )}
            {hand.potFlop !== undefined && (
              <div className="bg-ph-surface rounded-lg px-3 py-2">
                <div className="text-ph-text-muted mb-0.5">Flop 팟</div>
                <div className="text-ph-text font-semibold">{hand.potFlop.toLocaleString()}</div>
              </div>
            )}
            {hand.potTurn !== undefined && (
              <div className="bg-ph-surface rounded-lg px-3 py-2">
                <div className="text-ph-text-muted mb-0.5">Turn 팟</div>
                <div className="text-ph-text font-semibold">{hand.potTurn.toLocaleString()}</div>
              </div>
            )}
            {hand.potRiver !== undefined && (
              <div className="bg-ph-surface rounded-lg px-3 py-2">
                <div className="text-ph-text-muted mb-0.5">River 팟</div>
                <div className="text-ph-text font-semibold">{hand.potRiver.toLocaleString()}</div>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {hand.result && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ph-text-muted">결과:</span>
            <span
              className={cn(
                'text-sm font-bold',
                hand.result === 'won' ? 'text-ph-success' :
                hand.result === 'lost' ? 'text-ph-error' :
                'text-ph-text-muted'
              )}
            >
              {hand.result === 'won' ? '승리' : hand.result === 'lost' ? '패배' : '분할'}
            </span>
          </div>
        )}
      </div>

      {/* ── Analysis notes ───────────────────────────────────── */}
      {hand.analysisNotes && (
        <div className="bg-ph-elevated rounded-xl p-5 border border-ph-border">
          <h2 className="text-sm font-semibold text-ph-text mb-3">분석 노트</h2>
          <p className="text-sm text-ph-text-secondary whitespace-pre-wrap leading-relaxed">
            {hand.analysisNotes}
          </p>
        </div>
      )}

      {/* ── View toggle — 분석 보기 / 리플레이 ──────────────── */}
      {(streetData.length > 0 || replayerPlayers.length > 0) && (
        <div className="bg-ph-elevated rounded-xl border border-ph-border overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-ph-border">
            <button
              onClick={() => setView('analysis')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                view === 'analysis'
                  ? 'text-ph-gold border-b-2 border-ph-gold bg-ph-gold/5'
                  : 'text-ph-text-secondary hover:text-ph-text hover:bg-ph-surface'
              )}
            >
              <BarChart2 className="w-4 h-4" />
              분석 보기
            </button>
            <button
              onClick={() => setView('replay')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                view === 'replay'
                  ? 'text-ph-gold border-b-2 border-ph-gold bg-ph-gold/5'
                  : 'text-ph-text-secondary hover:text-ph-text hover:bg-ph-surface'
              )}
            >
              <Play className="w-4 h-4" />
              리플레이
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {view === 'analysis' ? (
              streetData.length > 0 ? (
                <StreetNavigator streets={streetData} sticky={false} />
              ) : (
                <p className="text-sm text-ph-text-muted text-center py-8">
                  액션 데이터가 없습니다
                </p>
              )
            ) : (
              replayerPlayers.length > 0 || replayerActions.length > 0 ? (
                <HandReplayer
                  players={replayerPlayers}
                  actions={replayerActions}
                  boardFlop={boardFlopStr}
                  boardTurn={boardTurnStr}
                  boardRiver={boardRiverStr}
                />
              ) : (
                <p className="text-sm text-ph-text-muted text-center py-8">
                  리플레이 데이터가 없습니다
                </p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
