'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PokerHand, Position, GameType, HandResult } from '@/types/poker';
import { HandCard } from '@/components/poker/HandCard';
import { getHands } from '../actions';
import { Plus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const POSITIONS: Position[] = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const TAGS = ['블러프', '밸류', '폴드', '쿨러', '배드빗', '블라인드디펜스', '3벳팟', '멀티웨이', '숏스택', '딥스택'];

export default function HandsPage() {
  const [hands, setHands] = useState<PokerHand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [selectedPosition, setSelectedPosition] = useState<Position | ''>('');
  const [selectedGameType, setSelectedGameType] = useState<GameType | ''>('');
  const [selectedResult, setSelectedResult] = useState<HandResult | ''>('');
  const [selectedTag, setSelectedTag] = useState<string>('');

  useEffect(() => {
    loadHands();
  }, [selectedPosition, selectedGameType, selectedResult, selectedTag, page]);

  const loadHands = async () => {
    setIsLoading(true);
    try {
      const filters: any = { page };
      if (selectedPosition) filters.position = selectedPosition;
      if (selectedGameType) filters.gameType = selectedGameType;
      if (selectedResult) filters.result = selectedResult;
      if (selectedTag) filters.tag = selectedTag;

      const data = await getHands(filters);
      setHands(data.hands);
      setTotalPages(data.totalPages);
      setTotalCount(data.total);
    } catch (error) {
      console.error('Failed to load hands:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFilters = () => {
    setSelectedPosition('');
    setSelectedGameType('');
    setSelectedResult('');
    setSelectedTag('');
    setPage(1);
  };

  const hasActiveFilters = selectedPosition || selectedGameType || selectedResult || selectedTag;

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1e1e1e] border-b border-[#333]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-[#c9a227]">핸드 히스토리</h1>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                showFilters
                  ? 'bg-[#c9a227] text-black'
                  : 'bg-[#2a2a2a] text-[#a0a0a0] hover:bg-[#333]'
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">필터</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
              )}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-[#2a2a2a] rounded-lg p-4 space-y-4">
              {/* Position filter */}
              <div>
                <label className="block text-xs font-medium text-[#a0a0a0] mb-2">
                  포지션
                </label>
                <div className="grid grid-cols-5 gap-2">
                  <button
                    onClick={() => { setSelectedPosition(''); setPage(1); }}
                    className={cn(
                      'px-3 py-2 rounded text-xs font-medium transition-all',
                      selectedPosition === ''
                        ? 'bg-[#c9a227] text-black'
                        : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333]'
                    )}
                  >
                    전체
                  </button>
                  {POSITIONS.map(pos => (
                    <button
                      key={pos}
                      onClick={() => { setSelectedPosition(pos); setPage(1); }}
                      className={cn(
                        'px-3 py-2 rounded text-xs font-medium transition-all',
                        selectedPosition === pos
                          ? 'bg-[#c9a227] text-black'
                          : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333]'
                      )}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              {/* Game type filter */}
              <div>
                <label className="block text-xs font-medium text-[#a0a0a0] mb-2">
                  게임 타입
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { setSelectedGameType(''); setPage(1); }}
                    className={cn(
                      'px-3 py-2 rounded text-xs font-medium transition-all',
                      selectedGameType === ''
                        ? 'bg-[#c9a227] text-black'
                        : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333]'
                    )}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => { setSelectedGameType('cash'); setPage(1); }}
                    className={cn(
                      'px-3 py-2 rounded text-xs font-medium transition-all',
                      selectedGameType === 'cash'
                        ? 'bg-[#c9a227] text-black'
                        : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333]'
                    )}
                  >
                    캐시
                  </button>
                  <button
                    onClick={() => { setSelectedGameType('tournament'); setPage(1); }}
                    className={cn(
                      'px-3 py-2 rounded text-xs font-medium transition-all',
                      selectedGameType === 'tournament'
                        ? 'bg-[#c9a227] text-black'
                        : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333]'
                    )}
                  >
                    토너먼트
                  </button>
                </div>
              </div>

              {/* Result filter */}
              <div>
                <label className="block text-xs font-medium text-[#a0a0a0] mb-2">
                  결과
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => { setSelectedResult(''); setPage(1); }}
                    className={cn(
                      'px-3 py-2 rounded text-xs font-medium transition-all',
                      selectedResult === ''
                        ? 'bg-[#c9a227] text-black'
                        : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333]'
                    )}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => { setSelectedResult('won'); setPage(1); }}
                    className={cn(
                      'px-3 py-2 rounded text-xs font-medium transition-all',
                      selectedResult === 'won'
                        ? 'bg-[#c9a227] text-black'
                        : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333]'
                    )}
                  >
                    승리
                  </button>
                  <button
                    onClick={() => { setSelectedResult('lost'); setPage(1); }}
                    className={cn(
                      'px-3 py-2 rounded text-xs font-medium transition-all',
                      selectedResult === 'lost'
                        ? 'bg-[#c9a227] text-black'
                        : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333]'
                    )}
                  >
                    패배
                  </button>
                  <button
                    onClick={() => { setSelectedResult('split'); setPage(1); }}
                    className={cn(
                      'px-3 py-2 rounded text-xs font-medium transition-all',
                      selectedResult === 'split'
                        ? 'bg-[#c9a227] text-black'
                        : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333]'
                    )}
                  >
                    스플릿
                  </button>
                </div>
              </div>

              {/* Tag filter */}
              <div>
                <label className="block text-xs font-medium text-[#a0a0a0] mb-2">
                  태그
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setSelectedTag(''); setPage(1); }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      selectedTag === ''
                        ? 'bg-[#c9a227] text-black'
                        : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333] border border-[#333]'
                    )}
                  >
                    전체
                  </button>
                  {TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => { setSelectedTag(tag); setPage(1); }}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                        selectedTag === tag
                          ? 'bg-[#c9a227] text-black'
                          : 'bg-[#1e1e1e] text-[#a0a0a0] hover:bg-[#333] border border-[#333]'
                      )}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset filters */}
              {hasActiveFilters && (
                <div className="pt-2 border-t border-[#333]">
                  <button
                    onClick={resetFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-[#a0a0a0] hover:text-[#e0e0e0] transition-colors"
                  >
                    필터 초기화
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-[#888]">로딩 중...</div>
          </div>
        ) : hands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[#888] mb-4">
              {hasActiveFilters ? '조건에 맞는 핸드가 없습니다' : '아직 공유된 핸드가 없습니다'}
            </div>
            {!hasActiveFilters && (
              <Link
                href="/hands/share"
                className="px-6 py-3 bg-[#c9a227] text-black rounded-lg font-medium hover:bg-[#d4af37] transition-colors"
              >
                첫 번째 핸드 공유하기
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-[#a0a0a0]">
              총 <span className="text-[#e0e0e0] font-medium">{totalCount}</span>개의 핸드
            </div>

            {/* Hand cards grid */}
            <div className="grid lg:grid-cols-2 gap-4">
              {hands.map(hand => (
                <HandCard
                  key={hand.id}
                  handId={hand.id}
                  heroCards={hand.heroCards.join(' ')}
                  boardCards={
                    [
                      ...(hand.boardFlop || []),
                      ...(hand.boardTurn ? [hand.boardTurn] : []),
                      ...(hand.boardRiver ? [hand.boardRiver] : []),
                    ].join(' ') || undefined
                  }
                  stakes={hand.stakes}
                  heroPosition={hand.heroPosition}
                  result={hand.result === 'won' ? 'won' : 'lost'}
                  winAmount={hand.result === 'won' ? hand.potFinal : undefined}
                  author={{
                    userId: hand.authorId,
                    nickname: hand.authorNickname || 'Unknown',
                    level: hand.authorLevel || 1,
                  }}
                  likes={hand.likeCount}
                  comments={hand.commentCount}
                  createdAt={new Date(hand.createdAt)}
                  isLiked={false}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className={cn(
                    'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    page <= 1
                      ? 'bg-[#2a2a2a] text-[#555] cursor-not-allowed'
                      : 'bg-[#2a2a2a] text-[#e0e0e0] hover:bg-[#333]'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  이전
                </button>
                <span className="text-sm text-[#a0a0a0]">
                  <span className="text-[#c9a227] font-bold">{page}</span> / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className={cn(
                    'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    page >= totalPages
                      ? 'bg-[#2a2a2a] text-[#555] cursor-not-allowed'
                      : 'bg-[#2a2a2a] text-[#e0e0e0] hover:bg-[#333]'
                  )}
                >
                  다음
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating CTA Button */}
      <Link
        href="/hands/share"
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#c9a227] rounded-full shadow-lg flex items-center justify-center hover:bg-[#d4af37] transition-all hover:scale-110 z-40"
        aria-label="핸드 공유하기"
      >
        <Plus className="w-6 h-6 text-black" />
      </Link>
    </div>
  );
}
