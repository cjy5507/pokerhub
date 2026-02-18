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
  { sb: 5, bb: 10, label: '5/10' },
  { sb: 10, bb: 20, label: '10/20' },
  { sb: 25, bb: 50, label: '25/50' },
  { sb: 50, bb: 100, label: '50/100' },
  { sb: 100, bb: 200, label: '100/200' },
];

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  waiting: { label: '대기 중', color: 'text-yellow-400 bg-yellow-400/10' },
  playing: { label: '게임 중', color: 'text-green-400 bg-green-400/10' },
  paused: { label: '일시정지', color: 'text-gray-400 bg-gray-400/10' },
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

    startTransition(async () => {
      try {
        await createPokerTable({
          name: tableName,
          smallBlind: selectedBlinds.sb,
          bigBlind: selectedBlinds.bb,
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#c9a227] flex items-center gap-3 mb-2">
              <Coins className="w-8 h-8 md:w-10 md:h-10" />
              포인트 포커
            </h1>
            <p className="text-[#a0a0a0] text-sm md:text-base">
              실시간 텍사스 홀덤 - 포인트로 즐기는 진짜 포커
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#c9a227] hover:bg-[#b89320] text-black font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            테이블 만들기
          </button>
        </div>

        {/* Blind Filters */}
        <div className="flex flex-wrap gap-2">
          {BLIND_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter.label === filter.label
                  ? 'bg-[#c9a227] text-black'
                  : 'bg-[#1e1e1e] text-[#a0a0a0] border border-[#333] hover:border-[#555]'
              }`}
            >
              {filter.label}
            </button>
          ))}
          <button
            onClick={() => router.refresh()}
            className="ml-auto px-3 py-2 rounded-lg text-sm text-[#a0a0a0] bg-[#1e1e1e] border border-[#333] hover:border-[#555] transition-colors flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
        </div>
      </div>

      {/* Table List */}
      <div className="max-w-7xl mx-auto">
        {filteredTables.length === 0 ? (
          <div className="bg-[#1e1e1e] border border-[#333] rounded-lg p-12 text-center">
            <Coins className="w-16 h-16 text-[#c9a227] mx-auto mb-4 opacity-50" />
            <p className="text-[#a0a0a0] text-lg mb-2">테이블이 없습니다</p>
            <p className="text-[#666] text-sm">첫 번째 테이블을 만들어보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTables.map((table) => {
              const isMyTable = table.id === myTableId;
              const badge = STATUS_BADGE[table.status] || STATUS_BADGE.paused;

              return (
                <div
                  key={table.id}
                  className={`bg-[#1e1e1e] border rounded-lg p-6 transition-colors ${
                    isMyTable
                      ? 'ring-2 ring-yellow-400/50 border-yellow-400/30'
                      : 'border-[#333] hover:border-[#c9a227]'
                  }`}
                >
                  {/* My Table Badge */}
                  {isMyTable && (
                    <div className="mb-3">
                      <span className="text-xs font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                        참여 중
                      </span>
                    </div>
                  )}

                  {/* Table Name + Status */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[#e0e0e0]">{table.name}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Blinds */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[#a0a0a0] text-sm">SB/BB:</span>
                    <span className="text-[#c9a227] font-semibold">
                      {table.smallBlind}/{table.bigBlind}
                    </span>
                  </div>

                  {/* Buy-in Range */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[#a0a0a0] text-sm">바이인:</span>
                    <span className="text-[#e0e0e0] text-sm">
                      {table.minBuyIn.toLocaleString()} - {table.maxBuyIn.toLocaleString()}P
                    </span>
                  </div>

                  {/* Seats + Dot Visualization */}
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-[#a0a0a0]" />
                    <span className="text-[#e0e0e0] text-sm">
                      {table.activePlayers}/{table.maxSeats}
                    </span>
                    <div className="flex gap-1 ml-2">
                      {Array.from({ length: table.maxSeats }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i < table.seatCount ? 'bg-green-400' : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hand Count */}
                  <div className="flex items-center gap-1 text-[#a0a0a0] text-sm mb-4">
                    <Hash className="w-4 h-4" />
                    <span>{table.handCount} 핸드</span>
                  </div>

                  {/* Enter Button */}
                  <Link
                    href={`/poker/${table.id}`}
                    className={`block w-full font-semibold py-2 rounded-lg text-center transition-colors ${
                      isMyTable
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                        : 'bg-[#0d7c50] hover:bg-[#0a6340] text-white'
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
            className="bg-[#1e1e1e] border border-[#333] rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-[#c9a227] mb-6">테이블 만들기</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Table Name */}
              <div>
                <label className="block text-sm font-medium text-[#e0e0e0] mb-2">
                  테이블 이름
                </label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-[#e0e0e0] focus:border-[#c9a227] focus:outline-none"
                  placeholder="나의 포커테이블"
                  maxLength={20}
                />
              </div>

              {/* Blinds */}
              <div>
                <label className="block text-sm font-medium text-[#e0e0e0] mb-2">
                  블라인드
                </label>
                <select
                  value={selectedBlinds.label}
                  onChange={(e) => {
                    const option = BLIND_OPTIONS.find((opt) => opt.label === e.target.value);
                    if (option) setSelectedBlinds(option);
                  }}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-2 text-[#e0e0e0] focus:border-[#c9a227] focus:outline-none"
                >
                  {BLIND_OPTIONS.map((option) => (
                    <option key={option.label} value={option.label}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max Seats */}
              <div>
                <label className="block text-sm font-medium text-[#e0e0e0] mb-2">
                  최대 인원
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="maxSeats"
                      value={2}
                      checked={maxSeats === 2}
                      onChange={() => setMaxSeats(2 as 6 | 9)}
                      className="w-4 h-4 text-[#c9a227] focus:ring-[#c9a227]"
                    />
                    <span className="text-[#e0e0e0]">2명 (헤즈업)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="maxSeats"
                      value={6}
                      checked={maxSeats === 6}
                      onChange={() => setMaxSeats(6)}
                      className="w-4 h-4 text-[#c9a227] focus:ring-[#c9a227]"
                    />
                    <span className="text-[#e0e0e0]">6명</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="maxSeats"
                      value={9}
                      checked={maxSeats === 9}
                      onChange={() => setMaxSeats(9)}
                      className="w-4 h-4 text-[#c9a227] focus:ring-[#c9a227]"
                    />
                    <span className="text-[#e0e0e0]">9명</span>
                  </label>
                </div>
              </div>

              {/* Buy-in Info */}
              <div className="bg-[#0a0a0a] border border-[#333] rounded-lg p-4">
                <p className="text-sm text-[#a0a0a0] mb-1">바이인 범위:</p>
                <p className="text-[#c9a227] font-semibold">
                  {calculateBuyInRange(selectedBlinds.bb)}
                </p>
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
                  className="flex-1 bg-[#333] hover:bg-[#444] text-[#e0e0e0] font-semibold py-2 rounded-lg transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-[#c9a227] hover:bg-[#b89320] text-black font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
