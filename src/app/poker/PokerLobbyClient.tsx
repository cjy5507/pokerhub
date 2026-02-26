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
    <div className="min-h-screen bg-[#0a0a0a] text-op-text p-4 md:p-8 pb-24 relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-op-gold/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-8 relative z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-5">
            <div className="p-3 md:p-4 bg-gradient-to-br from-op-gold/40 to-op-gold-hover/10 rounded-2xl shadow-[0_0_20px_rgba(201,162,39,0.3)] border border-op-gold/30">
              <Flame className="w-6 h-6 md:w-10 md:h-10 text-op-gold drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400 tracking-tight drop-shadow-sm mb-1">
                텍사스 홀덤 라운지
              </h1>
              <p className="text-white/50 text-sm md:text-base font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                실시간 라이브 테이블
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="group relative overflow-hidden bg-gradient-to-r from-op-gold to-op-gold-hover text-black font-black px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-[0_0_20px_rgba(201,162,39,0.3)]"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <Plus className="w-5 h-5 relative z-10" />
            <span className="relative z-10">테이블 만들기</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto mb-8 relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto w-full md:w-auto scrollbar-hide">
            <span className="text-sm font-semibold text-white/40 px-3 hidden sm:block">블라인드</span>
            {BLIND_FILTERS.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${activeFilter.label === filter.label
                    ? 'bg-gradient-to-b from-white/20 to-white/5 text-op-gold shadow-[0_0_15px_rgba(201,162,39,0.2)] border border-op-gold/30 scale-105'
                    : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => router.refresh()}
            className="ml-auto px-4 py-3 rounded-2xl text-sm font-medium text-white/60 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors flex items-center gap-2 active:scale-95 shadow-lg backdrop-blur-md"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">새로고침</span>
          </button>
        </div>
      </div>

      {/* Table Grid */}
      <div className="max-w-7xl mx-auto relative z-10">
        {filteredTables.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/5 rounded-3xl p-16 text-center shadow-2xl flex flex-col items-center">
            <div className="w-24 h-24 bg-black/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/5">
              <Trophy className="w-12 h-12 text-white/20" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">현재 열려있는 테이블이 없습니다</h3>
            <p className="text-white/40 mb-8 max-w-sm">블라인드를 변경하거나 직접 새로운 테이블을 만들어 게임을 시작해보세요.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-xl transition-all border border-white/10"
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
                    "group relative bg-[#111111] backdrop-blur-xl border rounded-[20px] md:rounded-[24px] p-4 md:p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden",
                    isMyTable
                      ? "border-op-gold/50 shadow-[0_0_30px_rgba(201,162,39,0.15)]"
                      : "border-white/10 hover:border-white/20"
                  )}
                >
                  {/* Premium internal glow top right */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full" />

                  {isMyTable && (
                    <div className="absolute -top-[1px] -left-[1px] -right-[1px] h-1 bg-gradient-to-r from-op-gold/0 via-op-gold to-op-gold/0" />
                  )}

                  <div className="flex items-start justify-between mb-5 relative z-10">
                    <div className="pr-4">
                      {isMyTable && (
                        <div className="flex items-center gap-1.5 mb-1 md:mb-2">
                          <Zap className="w-3.5 h-3.5 text-op-gold fill-op-gold animate-pulse" />
                          <span className="text-[10px] md:text-xs font-bold text-op-gold tracking-wider uppercase">내 테이블</span>
                        </div>
                      )}
                      <h3 className={cn(
                        "text-xl md:text-2xl font-black tracking-tight truncate",
                        isMyTable ? "text-white" : "text-gray-200"
                      )}>{table.name}</h3>
                    </div>

                    <span className={cn(
                      "shrink-0 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ring-1",
                      badge.bg, badge.text, badge.ring
                    )}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6 relative z-10">
                    <div className="bg-black/40 rounded-xl p-2.5 md:p-3 border border-white/5">
                      <div className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Blinds</div>
                      <div className="font-mono text-base md:text-lg font-black text-white/90">
                        {table.smallBlind}<span className="text-white/30">/</span>{table.bigBlind}
                      </div>
                    </div>
                    <div className="bg-black/40 rounded-xl p-2.5 md:p-3 border border-white/5">
                      <div className="text-[9px] md:text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Min Buy-in</div>
                      <div className="font-mono text-base md:text-lg font-black text-op-gold drop-shadow-sm">
                        {table.minBuyIn > 1000 ? `${table.minBuyIn / 1000}k` : table.minBuyIn}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between relative z-10">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className={cn("w-4 h-4", isFull ? "text-red-400" : "text-white/50")} />
                        <span className="text-sm font-bold text-white/80">
                          {table.activePlayers} <span className="text-white/30">/</span> {table.maxSeats}
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
                                ? isMyTable ? "bg-op-gold shadow-[0_0_8px_rgba(201,162,39,0.5)]" : "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                                : "bg-white/10"
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    <Link
                      href={`/poker/${table.id}`}
                      className={cn(
                        "px-6 py-3 rounded-xl font-bold text-sm tracking-wide transition-all",
                        isMyTable
                          ? "bg-gradient-to-br from-gray-700 to-gray-800 text-white hover:from-gray-600 hover:to-gray-700 border border-gray-600/50 shadow-lg"
                          : isFull && !isMyTable
                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                            : "bg-white/10 hover:bg-white/20 text-white border border-white/10 shadow-lg backdrop-blur-sm"
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" />

          {/* Modal Content */}
          <div
            className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-op-gold via-yellow-200 to-op-gold" />

            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  <div className="p-2 bg-op-gold/20 rounded-lg">
                    <Plus className="w-5 h-5 text-op-gold" />
                  </div>
                  새 테이블 생성
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                >
                  <Plus className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Table Name */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Table Name</label>
                  <input
                    type="text"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3.5 text-white font-medium focus:border-op-gold/50 focus:ring-1 focus:ring-op-gold/50 transition-all outline-none placeholder:text-white/20"
                    placeholder="VIP 라운지"
                    maxLength={20}
                  />
                </div>

                {/* Blinds */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between pl-1">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest">Blinds (SB/BB)</label>
                    <div className="flex bg-black/50 rounded-lg p-0.5 border border-white/5">
                      <button
                        type="button"
                        onClick={() => setUseCustomBlinds(false)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${!useCustomBlinds ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
                          }`}
                      >
                        Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => setUseCustomBlinds(true)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${useCustomBlinds ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
                          }`}
                      >
                        Custom
                      </button>
                    </div>
                  </div>

                  {useCustomBlinds ? (
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-bold text-sm">SB</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={customSB}
                          onChange={(e) => setCustomSB(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white font-black text-lg focus:border-op-gold/50 focus:ring-1 focus:ring-op-gold/50 outline-none"
                          placeholder="0"
                          min={1}
                        />
                      </div>
                      <div className="relative flex-1">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-bold text-sm">BB</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={customBB}
                          onChange={(e) => setCustomBB(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white font-black text-lg focus:border-op-gold/50 focus:ring-1 focus:ring-op-gold/50 outline-none"
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
                              ? "bg-op-gold/10 border-op-gold/50 text-op-gold shadow-[inset_0_0_15px_rgba(201,162,39,0.1)]"
                              : "bg-black/30 border-white/5 text-white/50 hover:bg-white/5 hover:text-white"
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
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Ante</label>
                    <div className="relative">
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-bold text-sm">P</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={ante}
                        onChange={(e) => setAnte(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white font-bold focus:border-op-gold/50 focus:ring-1 focus:ring-op-gold/50 outline-none placeholder:text-white/20"
                        placeholder="0"
                        min={0}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest pl-1">Max Seats</label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-black/50 border border-white/10 rounded-xl h-[50px]">
                      {[2, 6, 9].map((seatCount) => (
                        <button
                          key={seatCount}
                          type="button"
                          onClick={() => setMaxSeats(seatCount as 2 | 6 | 9)}
                          className={cn(
                            "h-full rounded-lg text-sm font-bold flex flex-col items-center justify-center transition-all",
                            maxSeats === seatCount
                              ? "bg-white/15 text-white shadow-sm"
                              : "text-white/40 hover:text-white/60"
                          )}
                        >
                          {seatCount}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Summary Info Box */}
                <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-xl p-4 flex justify-between items-center backdrop-blur-sm">
                  <div>
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Buy-in Range</div>
                    <div className="font-mono text-op-gold font-black shadow-sm">
                      {calculateBuyInRange(useCustomBlinds ? (parseInt(customBB) || 0) : selectedBlinds.bb)}
                    </div>
                  </div>
                  <Coins className="w-8 h-8 text-white/10" />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                    <p className="text-red-400 text-sm font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full group relative overflow-hidden bg-gradient-to-r from-op-gold to-yellow-500 text-black font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_30px_rgba(201,162,39,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
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
