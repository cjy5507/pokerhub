'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Coins, Hash, RefreshCw } from 'lucide-react';
import { createPokerTable } from './actions';
import type { PokerTableWithSeats } from './actions';

type BlindFilter = {
  label: string;
  sb: number | null;
  bb: number | null;
};

const BLIND_FILTERS: BlindFilter[] = [
  { label: '전체', sb: null, bb: null },
  { label: '10/20', sb: 10, bb: 20 },
  { label: '50/100', sb: 50, bb: 100 },
  { label: '100/200', sb: 100, bb: 200 },
  { label: '500/1000', sb: 500, bb: 1000 },
];

type BlindOption = {
  sb: number;
  bb: number;
  label: string;
};

const BLIND_OPTIONS: BlindOption[] = [
  { sb: 1, bb: 2, label: '1/2' },
  { sb: 2, bb: 5, label: '2/5' },
  { sb: 5, bb: 10, label: '5/10' },
  { sb: 10, bb: 20, label: '10/20' },
  { sb: 25, bb: 50, label: '25/50' },
  { sb: 50, bb: 100, label: '50/100' },
  { sb: 100, bb: 200, label: '100/200' },
  { sb: 250, bb: 500, label: '250/500' },
  { sb: 500, bb: 1000, label: '500/1000' },
];

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  waiting: { label: '대기 중', color: 'text-op-warning bg-op-warning-dim' },
  playing: { label: '게임 중', color: 'text-op-success bg-op-success-dim' },
  paused: { label: '일시정지', color: 'text-op-text-muted bg-op-elevated' },
};

type PokerLobbyClientProps = {
  tables: PokerTableWithSeats[];
  myTableId: string | null;
};

export function PokerLobbyClient({ tables, myTableId }: PokerLobbyClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tableName, setTableName] = useState('');
  const [selectedBlinds, setSelectedBlinds] = useState<BlindOption>(BLIND_OPTIONS[1]);
  const [maxSeats, setMaxSeats] = useState<2 | 6 | 9>(6);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<BlindFilter>(BLIND_FILTERS[0]);
  const [ante, setAnte] = useState(0);
  const [useCustomBlinds, setUseCustomBlinds] = useState(false);
  const [customSB, setCustomSB] = useState('');
  const [customBB, setCustomBB] = useState('');

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tableName.trim()) {
      setError('테이블 이름을 입력해주세요');
      return;
    }

    let sb: number, bb: number;
    if (useCustomBlinds) {
      sb = parseInt(customSB, 10);
      bb = parseInt(customBB, 10);
      if (isNaN(sb) || isNaN(bb) || sb <= 0 || bb <= 0) {
        setError('블라인드 값을 올바르게 입력해주세요');
        return;
      }
      if (bb <= sb) {
        setError('빅블라인드는 스몰블라인드보다 커야 합니다');
        return;
      }
    } else {
      sb = selectedBlinds.sb;
      bb = selectedBlinds.bb;
    }

    if (ante < 0 || ante > bb) {
      setError('앤티는 0 이상, 빅블라인드 이하여야 합니다');
      return;
    }

    startTransition(async () => {
      try {
        await createPokerTable({
          name: tableName,
          smallBlind: sb,
          bigBlind: bb,
          ante,
          maxSeats,
        });
      } catch (err: any) {
        setError(err.message || '테이블 생성에 실패했습니다');
      }
    });
  };

  const calculateBuyInRange = (bb: number) => {
    const min = bb * 20;
    const max = bb * 100;
    return `${min.toLocaleString()} - ${max.toLocaleString()}P`;
  };

  // Filter tables by blind level
  const filteredTables = activeFilter.sb === null
    ? tables
    : tables.filter(
        (t) => t.smallBlind === activeFilter.sb && t.bigBlind === activeFilter.bb
      );

  return (
    <div className="min-h-screen bg-op-deep text-op-text p-3 md:p-8 pb-20 lg:pb-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-3 md:mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 mb-3 md:mb-4">
          <div>
            <h1 className="text-xl md:text-4xl font-bold text-op-gold flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
              <Coins className="w-6 h-6 md:w-10 md:h-10" />
              포인트 포커
            </h1>
            <p className="text-op-text-secondary text-xs md:text-base">
              실시간 텍사스 홀덤 - 포인트로 즐기는 진짜 포커
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-op-gold hover:bg-op-gold-hover text-black font-semibold px-4 py-2 md:px-6 md:py-3 rounded-lg flex items-center gap-1.5 md:gap-2 transition-colors text-sm md:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            테이블 만들기
          </button>
        </div>

        {/* Blind Filters */}
        <div className="flex flex-wrap gap-2">
          {BLIND_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                activeFilter.label === filter.label
                  ? 'bg-op-gold text-black'
                  : 'bg-op-surface text-op-text-secondary border border-op-border hover:border-op-border-medium'
              }`}
            >
              {filter.label}
            </button>
          ))}
          <button
            onClick={() => router.refresh()}
            className="ml-auto px-3 py-2 rounded-lg text-sm text-op-text-secondary bg-op-surface border border-op-border hover:border-op-border-medium transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
        </div>
      </div>

      {/* Table List */}
      <div className="max-w-7xl mx-auto">
        {filteredTables.length === 0 ? (
          <div className="bg-op-surface border border-op-border rounded-lg p-6 md:p-12 text-center">
            <Coins className="w-10 h-10 md:w-16 md:h-16 text-op-gold mx-auto mb-3 md:mb-4 opacity-50" />
            <p className="text-op-text-secondary text-base md:text-lg mb-1 md:mb-2">테이블이 없습니다</p>
            <p className="text-op-text-dim text-sm">첫 번째 테이블을 만들어보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTables.map((table) => {
              const isMyTable = table.id === myTableId;
              const badge = STATUS_BADGE[table.status] || STATUS_BADGE.paused;

              return (
                <div
                  key={table.id}
                  className={`bg-op-surface border rounded-lg p-4 sm:p-6 transition-colors ${
                    isMyTable
                      ? 'ring-2 ring-op-gold/50 border-op-gold/30'
                      : 'border-op-border hover:border-op-gold'
                  }`}
                >
                  {/* My Table Badge */}
                  {isMyTable && (
                    <div className="mb-3">
                      <span className="text-xs font-semibold text-op-warning bg-op-warning-dim px-2 py-1 rounded">
                        참여 중
                      </span>
                    </div>
                  )}

                  {/* Table Name + Status */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-op-text truncate">{table.name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Blinds */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-op-text-secondary text-sm">SB/BB:</span>
                    <span className="text-op-gold font-semibold">
                      {table.smallBlind}/{table.bigBlind}
                    </span>
                  </div>

                  {/* Buy-in Range */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-op-text-secondary text-sm">바이인:</span>
                    <span className="text-op-text text-sm">
                      {table.minBuyIn.toLocaleString()} - {table.maxBuyIn.toLocaleString()}P
                    </span>
                  </div>

                  {/* Seats + Dot Visualization */}
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-op-text-secondary" />
                    <span className="text-op-text text-sm">
                      {table.activePlayers}/{table.maxSeats}
                    </span>
                    <div className="flex gap-1 ml-2">
                      {Array.from({ length: table.maxSeats }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < table.seatCount ? 'bg-op-success' : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hand Count */}
                  <div className="flex items-center gap-1 text-op-text-secondary text-sm mb-4">
                    <Hash className="w-4 h-4" />
                    <span>{table.handCount} 핸드</span>
                  </div>

                  {/* Enter Button */}
                  <Link
                    href={`/poker/${table.id}`}
                    className={`block w-full font-semibold py-2 rounded-lg text-center transition-colors ${
                      isMyTable
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                        : 'bg-op-enter hover:bg-op-enter-hover text-white'
                    }`}
                  >
                    {isMyTable ? '돌아가기' : '입장'}
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Table Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-op-surface border border-op-border rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl sm:text-2xl font-bold text-op-gold mb-6">테이블 만들기</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Table Name */}
              <div>
                <label className="block text-sm font-medium text-op-text mb-2">
                  테이블 이름
                </label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-op-deep border border-op-border rounded-lg px-4 py-2 text-op-text focus:border-op-gold focus:outline-none"
                  placeholder="나의 포커테이블"
                  maxLength={20}
                />
              </div>

              {/* Blinds */}
              <div>
                <label className="block text-sm font-medium text-op-text mb-2">
                  블라인드 (SB/BB)
                </label>

                {/* Toggle: Preset vs Custom */}
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setUseCustomBlinds(false)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      !useCustomBlinds ? 'bg-op-gold text-black' : 'bg-op-elevated text-op-text-secondary'
                    }`}
                  >
                    프리셋
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomBlinds(true)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      useCustomBlinds ? 'bg-op-gold text-black' : 'bg-op-elevated text-op-text-secondary'
                    }`}
                  >
                    커스텀
                  </button>
                </div>

                {useCustomBlinds ? (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={customSB}
                      onChange={(e) => setCustomSB(e.target.value)}
                      className="flex-1 bg-op-deep border border-op-border rounded-lg px-3 py-2 text-op-text text-center focus:border-op-gold focus:outline-none"
                      placeholder="SB"
                      min={1}
                    />
                    <span className="text-op-text-muted">/</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={customBB}
                      onChange={(e) => setCustomBB(e.target.value)}
                      className="flex-1 bg-op-deep border border-op-border rounded-lg px-3 py-2 text-op-text text-center focus:border-op-gold focus:outline-none"
                      placeholder="BB"
                      min={1}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {BLIND_OPTIONS.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setSelectedBlinds(option)}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                          selectedBlinds.label === option.label
                            ? 'bg-op-gold text-black'
                            : 'bg-op-elevated text-op-text-secondary hover:bg-op-border'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Ante */}
              <div>
                <label className="block text-sm font-medium text-op-text mb-2">
                  앤티
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={ante}
                    onChange={(e) => setAnte(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-op-deep border border-op-border rounded-lg px-4 py-2 text-op-text focus:border-op-gold focus:outline-none"
                    placeholder="0 (없음)"
                    min={0}
                  />
                </div>
                <p className="text-xs text-op-text-dim mt-1">
                  0 = 앤티 없음. 앤티는 빅블라인드 이하로 설정하세요.
                </p>
              </div>

              {/* Max Seats */}
              <div>
                <label className="block text-sm font-medium text-op-text mb-2">
                  최대 인원
                </label>
                <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="maxSeats"
                      value={2}
                      checked={maxSeats === 2}
                      onChange={() => setMaxSeats(2 as 6 | 9)}
                      className="w-4 h-4 text-op-gold focus:ring-op-gold"
                    />
                    <span className="text-op-text">2명 (헤즈업)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="maxSeats"
                      value={6}
                      checked={maxSeats === 6}
                      onChange={() => setMaxSeats(6)}
                      className="w-4 h-4 text-op-gold focus:ring-op-gold"
                    />
                    <span className="text-op-text">6명</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="maxSeats"
                      value={9}
                      checked={maxSeats === 9}
                      onChange={() => setMaxSeats(9)}
                      className="w-4 h-4 text-op-gold focus:ring-op-gold"
                    />
                    <span className="text-op-text">9명</span>
                  </label>
                </div>
              </div>

              {/* Buy-in Info */}
              <div className="bg-op-deep border border-op-border rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-op-text-secondary">바이인 범위</span>
                  <span className="text-op-gold font-semibold">
                    {calculateBuyInRange(useCustomBlinds ? (parseInt(customBB) || 0) : selectedBlinds.bb)}
                  </span>
                </div>
                {ante > 0 && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-op-text-secondary">앤티</span>
                    <span className="text-op-warning font-semibold">{ante}P / 핸드</span>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-op-elevated hover:bg-op-border-medium text-op-text font-semibold py-2 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-op-gold hover:bg-op-gold-hover text-black font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? '생성 중...' : '만들기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
