'use client';

import { PokerHand } from '@/types/poker';
import { Heart, MessageSquare, Eye } from 'lucide-react';

interface HandDetailClientProps {
  hand: PokerHand;
}

export function HandDetailClient({ hand }: HandDetailClientProps) {
  const formatCard = (card: string) => {
    const suit = card.slice(-1);
    const rank = card.slice(0, -1);
    const suitSymbol = {
      h: '♥',
      d: '♦',
      c: '♣',
      s: '♠',
    }[suit];
    const suitColor = suit === 'h' || suit === 'd' ? '#ef4444' : '#000000';
    
    return (
      <span className="inline-flex items-center justify-center w-12 h-16 bg-white rounded border-2 border-gray-300 font-bold text-lg mx-0.5">
        <span style={{ color: suitColor }}>
          {rank}
          {suitSymbol}
        </span>
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#c9a227] flex items-center justify-center text-[#121212] font-bold">
              {hand.authorNickname?.charAt(0) || 'P'}
            </div>
            <div>
              <div className="text-[#e0e0e0] font-semibold">{hand.authorNickname || '익명'}</div>
              <div className="text-sm text-[#a0a0a0]">Lv {hand.authorLevel || 1}</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-[#a0a0a0]">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{hand.likeCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{hand.commentCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{hand.viewCount}</span>
            </div>
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-[#888]">게임 타입</div>
            <div className="text-[#e0e0e0] font-medium">
              {hand.gameType === 'cash' ? '캐시 게임' : '토너먼트'}
            </div>
          </div>
          <div>
            <div className="text-[#888]">테이블</div>
            <div className="text-[#e0e0e0] font-medium">{hand.tableSize}</div>
          </div>
          <div>
            <div className="text-[#888]">스테이크</div>
            <div className="text-[#e0e0e0] font-medium">${hand.stakes}</div>
          </div>
          <div>
            <div className="text-[#888]">포지션</div>
            <div className="text-[#e0e0e0] font-medium">{hand.heroPosition}</div>
          </div>
        </div>
      </div>

      {/* Hand Information */}
      <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-[#e0e0e0] mb-4">핸드 정보</h2>
        
        {/* Hero Cards */}
        <div className="mb-4">
          <div className="text-sm text-[#a0a0a0] mb-2">홀 카드</div>
          <div className="flex gap-1">
            {hand.heroCards.map((card, idx) => (
              <div key={idx}>{formatCard(card)}</div>
            ))}
          </div>
        </div>

        {/* Board */}
        {hand.boardFlop && (
          <div className="mb-4">
            <div className="text-sm text-[#a0a0a0] mb-2">보드</div>
            <div className="flex gap-1 flex-wrap">
              {hand.boardFlop.map((card, idx) => (
                <div key={idx}>{formatCard(card)}</div>
              ))}
              {hand.boardTurn && (
                <>
                  <div className="w-4" />
                  {formatCard(hand.boardTurn)}
                </>
              )}
              {hand.boardRiver && (
                <>
                  <div className="w-4" />
                  {formatCard(hand.boardRiver)}
                </>
              )}
            </div>
          </div>
        )}

        {/* Pot Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {hand.potPreflop !== undefined && (
            <div>
              <div className="text-[#888]">프리플랍 팟</div>
              <div className="text-[#e0e0e0] font-medium">${hand.potPreflop}</div>
            </div>
          )}
          {hand.potFlop !== undefined && (
            <div>
              <div className="text-[#888]">플랍 팟</div>
              <div className="text-[#e0e0e0] font-medium">${hand.potFlop}</div>
            </div>
          )}
          {hand.potTurn !== undefined && (
            <div>
              <div className="text-[#888]">턴 팟</div>
              <div className="text-[#e0e0e0] font-medium">${hand.potTurn}</div>
            </div>
          )}
          {hand.potRiver !== undefined && (
            <div>
              <div className="text-[#888]">리버 팟</div>
              <div className="text-[#e0e0e0] font-medium">${hand.potRiver}</div>
            </div>
          )}
        </div>

        {/* Result */}
        {hand.result && (
          <div className="mt-4 p-3 rounded-lg bg-[#2a2a2a]">
            <span className="text-sm text-[#a0a0a0]">결과: </span>
            <span
              className={`font-bold ${
                hand.result === 'won'
                  ? 'text-[#22c55e]'
                  : hand.result === 'lost'
                  ? 'text-[#ef4444]'
                  : 'text-[#a0a0a0]'
              }`}
            >
              {hand.result === 'won' ? '승리' : hand.result === 'lost' ? '패배' : '분할'}
            </span>
            {hand.potFinal && (
              <span className="text-[#e0e0e0] ml-2">(${hand.potFinal})</span>
            )}
          </div>
        )}
      </div>

      {/* Analysis */}
      {hand.analysisNotes && (
        <div className="bg-[#1e1e1e] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-[#e0e0e0] mb-4">분석</h2>
          <div className="text-[#e0e0e0] whitespace-pre-wrap">{hand.analysisNotes}</div>
        </div>
      )}

      {/* Tags */}
      {hand.tags && hand.tags.length > 0 && (
        <div className="bg-[#1e1e1e] rounded-lg p-6">
          <h2 className="text-xl font-bold text-[#e0e0e0] mb-4">태그</h2>
          <div className="flex flex-wrap gap-2">
            {hand.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-[#2a2a2a] text-[#c9a227] rounded-full text-sm"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
