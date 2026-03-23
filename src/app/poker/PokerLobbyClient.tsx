'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, Coins, Hash, RefreshCw, Zap, Trophy, Flame } from 'lucide-react';
import { createPokerTable } from './actions';
import type { PokerTableWithSeats } from './actions';
import { cn } from '@/lib/utils';

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

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  waiting: { label: '대기 중', bg: 'bg-yellow-500/20', text: 'text-yellow-400', ring: 'ring-yellow-500/30' },
  playing: { label: '게임 중', bg: 'bg-emerald-500/20', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  paused: { label: '일시정지', bg: 'bg-white/10', text: 'text-white/60', ring: 'ring-white/20' },
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
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-8 px-4 mt-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 md:p-4 bg-op-surface border border-op-border rounded-xl shadow-sm">
              <Flame className="w-6 h-6 md:w-8 md:h-8 text-op-gold" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-op-text tracking-tight mb-1">텍사스 홀덤</h1>
              <p className="text-op-text-secondary text-sm md:text-base font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-op-success" />
                실시간 라이브 테이블
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-op-gold hover:bg-op-gold-hover text-op-text-inverse font-bold px-4 md:px-6 py-3 border border-op-border md:py-3.5 rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>테이블 만들기</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto mb-8 px-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-op-surface p-1.5 rounded-xl border border-op-border overflow-x-auto w-full md:w-auto scrollbar-hide shadow-sm">
            <span className="text-sm font-semibold text-op-text-muted px-3 hidden sm:block">블라인드</span>
            {BLIND_FILTERS.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeFilter.label === filter.label
                    ? 'bg-op-elevated text-op-text shadow-sm border border-op-border'
                    : 'bg-transparent text-op-text-secondary hover:text-op-text hover:bg-op-elevated/50 border border-transparent'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => router.refresh()}
            className="ml-auto px-4 py-2.5 rounded-xl text-sm font-medium text-op-text-secondary bg-op-surface border border-op-border hover:bg-op-elevated transition-colors flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">새로고침</span>
          </button>
        </div>
      </div>

      {/* Table Grid */}
      <div className="max-w-7xl mx-auto px-4">
        {filteredTables.length === 0 ? (
          <div className="bg-op-surface border border-op-border rounded-2xl p-16 text-center shadow-sm flex flex-col items-center">
            <div className="w-24 h-24 bg-op-elevated rounded-full flex items-center justify-center mb-6 border border-op-border">
              <Trophy className="w-12 h-12 text-op-text-muted" />
            </div>
            <h3 className="text-2xl font-bold text-op-text mb-2 tracking-tight">현재 열려있는 테이블이 없습니다</h3>
            <p className="text-op-text-secondary mb-8 max-w-sm">블라인드를 변경하거나 직접 새로운 테이블을 만들어 게임을 시작해보세요.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-op-elevated hover:bg-op-border text-op-text font-bold px-6 py-3 rounded-xl transition-all border border-op-border shadow-sm"
            >
              새 테이블 생성하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredTables.map((table) => {
              const isMyTable = table.id === myTableId;
              const badge = STATUS_BADGE[table.status] || STATUS_BADGE.paused;
              const fullness = table.activePlayers / table.maxSeats;
              const isFull = table.activePlayers === table.maxSeats;

              return (
                <div
                  key={table.id}
                  className={cn(
                    "group relative bg-op-surface border rounded-2xl p-5 md:p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1 overflow-hidden",
                    isMyTable
                      ? "border-op-gold shadow-sm ring-1 ring-op-gold/20"
                      : "border-op-border hover:border-op-gold/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="pr-4">
                      {isMyTable && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Zap className="w-3.5 h-3.5 text-op-gold fill-op-gold" />
                          <span className="text-[10px] md:text-xs font-bold text-op-gold tracking-wider uppercase">내 테이블</span>
                        </div>
                      )}
                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-op-text truncate">
                        {table.name}
                      </h3>
                    </div>

                    <span className={cn(
                      "shrink-0 px-2.5 py-1 text-xs font-bold rounded-full border",
                      table.status === 'playing' ? 'bg-op-success/10 text-op-success border-op-success/20' :
                      table.status === 'waiting' ? 'bg-op-warning/10 text-op-warning border-op-warning/20' :
                                                   'bg-op-elevated text-op-text-muted border-op-border'
                    )}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-op-elevated rounded-xl p-3 border border-op-border">
                      <div className="text-[10px] text-op-text-muted uppercase tracking-widest font-bold mb-1">Blinds</div>
                      <div className="font-mono text-base md:text-lg font-bold text-op-text">
                        {table.smallBlind}<span className="text-op-text-muted">/</span>{table.bigBlind}
                      </div>
                    </div>
                    <div className="bg-op-elevated rounded-xl p-3 border border-op-border">
                      <div className="text-[10px] text-op-text-muted uppercase tracking-widest font-bold mb-1">Min Buy-in</div>
                      <div className="font-mono text-base md:text-lg font-bold text-op-gold">
                        {table.minBuyIn > 1000 ? `${table.minBuyIn / 1000}k` : table.minBuyIn}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className={cn("w-4 h-4", isFull ? "text-op-error" : "text-op-text-secondary")} />
                        <span className="text-sm font-bold text-op-text">
                          {table.activePlayers} <span className="text-op-text-muted">/</span> {table.maxSeats}
                        </span>
                      </div>

                      {/* Visual Seat Indicators */}
                      <div className="flex gap-1.5 align-middle">
                        {Array.from({ length: table.maxSeats }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-8 h-1.5 rounded-full transition-all duration-300",
                              i < table.activePlayers
                                ? isMyTable ? "bg-op-gold" : "bg-op-success"
                                : "bg-op-border"
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <Link
                      href={`/poker/${table.id}`}
                      className={cn(
                        "px-5 py-2.5 rounded-xl font-bold text-sm transition-all border",
                        isMyTable
                          ? "bg-op-elevated text-op-text hover:bg-op-border border-op-border shadow-sm"
                          : isFull && !isMyTable
                            ? "bg-op-error/10 text-op-error border-op-error/20"
                            : "bg-op-gold text-op-text-inverse border-op-gold-hover hover:bg-op-gold-hover shadow-sm"
                      )}
                    >
                      {isMyTable ? '테이블로' : isFull ? '관전' : '입장하기'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modern Modal Overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />

          {/* Modal Content */}
          <div
            className="relative w-full max-w-lg bg-op-surface border border-op-border rounded-3xl overflow-hidden shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent line */}
            <div className="h-1.5 w-full bg-op-gold" />

            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-op-text tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-op-elevated rounded-lg border border-op-border">
                    <Plus className="w-5 h-5 text-op-gold" />
                  </div>
                  새 테이블 생성
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-op-elevated hover:bg-op-border rounded-full text-op-text-secondary hover:text-op-text transition-colors border border-transparent hover:border-op-border"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Table Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-op-text-muted uppercase tracking-widest pl-1">Table Name</label>
                  <input
                    type="text"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="w-full bg-op-background border border-op-border rounded-xl px-4 py-3.5 text-op-text font-medium focus:border-op-gold focus:ring-1 focus:ring-op-gold transition-all outline-none placeholder:text-op-text-muted"
                    placeholder="VIP 라운지"
                    maxLength={20}
                  />
                </div>

                {/* Blinds */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pl-1">
                    <label className="text-xs font-bold text-op-text-muted uppercase tracking-widest">Blinds (SB/BB)</label>
                    <div className="flex bg-op-background rounded-lg p-0.5 border border-op-border">
                      <button
                        type="button"
                        onClick={() => setUseCustomBlinds(false)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${!useCustomBlinds ? 'bg-op-elevated text-op-text shadow-sm border border-op-border' : 'text-op-text-secondary hover:text-op-text'
                          }`}
                      >
                        Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseCustomBlinds(true)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${useCustomBlinds ? 'bg-op-elevated text-op-text shadow-sm border border-op-border' : 'text-op-text-secondary hover:text-op-text'
                          }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  {useCustomBlinds ? (
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-op-text-muted font-bold text-sm">SB</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={customSB}
                          onChange={(e) => setCustomSB(e.target.value)}
                          className="w-full bg-op-background border border-op-border rounded-xl pl-12 pr-4 py-3 text-op-text font-bold text-lg focus:border-op-gold focus:ring-1 focus:ring-op-gold outline-none"
                          placeholder="0"
                          min={1}
                        />
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-op-text-muted font-bold text-sm">BB</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={customBB}
                          onChange={(e) => setCustomBB(e.target.value)}
                          className="w-full bg-op-background border border-op-border rounded-xl pl-12 pr-4 py-3 text-op-text font-bold text-lg focus:border-op-gold focus:ring-1 focus:ring-op-gold outline-none"
                          placeholder="0"
                          min={1}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {BLIND_OPTIONS.map((option) => (
                        <button
                          key={option.label}
                          type="button"
                          onClick={() => setSelectedBlinds(option)}
                          className={cn(
                            "py-2.5 rounded-xl text-sm font-bold border transition-all",
                            selectedBlinds.label === option.label
                              ? "bg-op-gold/10 border-op-gold text-op-gold"
                              : "bg-op-background border-op-border text-op-text-secondary hover:bg-op-elevated hover:text-op-text"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ante & Max Seats row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-op-text-muted uppercase tracking-widest pl-1">Ante</label>
                    <div className="relative">
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-op-text-muted font-bold text-sm">P</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={ante}
                        onChange={(e) => setAnte(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-op-background border border-op-border rounded-xl pl-4 pr-10 py-3 text-op-text font-bold focus:border-op-gold focus:ring-1 focus:ring-op-gold outline-none placeholder:text-op-text-muted"
                        placeholder="0"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-op-text-muted uppercase tracking-widest pl-1">Max Seats</label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-op-background border border-op-border rounded-xl h-[50px]">
                      {[2, 6, 9].map((seatCount) => (
                        <button
                          key={seatCount}
                          type="button"
                          onClick={() => setMaxSeats(seatCount as 2 | 6 | 9)}
                          className={cn(
                            "h-full rounded-lg text-sm font-bold flex flex-col items-center justify-center transition-all",
                            maxSeats === seatCount
                              ? "bg-op-elevated text-op-text border border-op-border shadow-sm"
                              : "text-op-text-secondary hover:text-op-text hover:bg-op-elevated/50"
                          )}
                        >
                          {seatCount}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary Info Box */}
                <div className="bg-op-elevated border border-op-border rounded-xl p-4 flex justify-between items-center shadow-sm">
                  <div>
                    <div className="text-[10px] font-bold text-op-text-muted uppercase tracking-widest mb-1">Buy-in Range</div>
                    <div className="font-mono text-op-gold font-bold">
                      {calculateBuyInRange(useCustomBlinds ? (parseInt(customBB) || 0) : selectedBlinds.bb)}
                    </div>
                  </div>
                  <Coins className="w-8 h-8 text-op-text-muted" />
                </div>

                {error && (
                  <div className="bg-op-error/10 border border-op-error/20 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-op-error animate-pulse shrink-0" />
                    <p className="text-op-error text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-op-gold text-op-text-inverse font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all hover:bg-op-gold-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-op-border"
                >
                  <span className="relative z-10">{isPending ? '테이블 편성 중...' : '게임 시작하기'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
