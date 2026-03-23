import React, { useMemo } from "react";
import { History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BaccaratRoadmapProps {
  history: string[];
  gameState: 'waiting' | 'betting' | 'dealing' | 'result';
}

const CELL_TEXT = {
  P: 'P',
  B: 'B',
  T: 'T',
};

const ROADMAP_CSS = `
@keyframes beadPulse {
  0% { box-shadow: 0 0 0 0 rgba(148,163,184,0.22); }
  100% { box-shadow: 0 0 0 9px rgba(148,163,184,0); }
}
`;

const BaccaratRoadmapComponent: React.FC<BaccaratRoadmapProps> = ({ history, gameState }) => {
  const visibleHistory = useMemo(() => history.slice(-108), [history]);
  const stats = useMemo(() => visibleHistory.reduce((acc, result) => {
    if (result === 'P') acc.player += 1;
    if (result === 'B') acc.banker += 1;
    if (result === 'T') acc.tie += 1;
    return acc;
  }, { player: 0, banker: 0, tie: 0 }), [visibleHistory]);

  return (
    <div className="h-full flex flex-col p-2 md:p-3">
      <style dangerouslySetInnerHTML={{ __html: ROADMAP_CSS }} />
      <div className="flex items-center gap-2 text-white/90 pb-2">
        <History className="w-4 h-4 text-blue-300" />
        <span className="text-[10px] md:text-sm font-black tracking-[0.18em] uppercase">로드맵</span>
      </div>

      <div className="flex-1 min-h-0 rounded-2xl border border-white/15 bg-black/45 p-2 md:p-3 overflow-hidden flex flex-col">
        {visibleHistory.length === 0 && (
          <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 mb-2 text-[11px] text-white/60 font-black tracking-[0.1em] uppercase text-center">
            아직 결과 내역이 없습니다
          </div>
        )}
        <div className="grid grid-cols-6 gap-1.5">
          <AnimatePresence>
            {visibleHistory.map((res, i) => {
              const isLatest = gameState === 'result' && i === visibleHistory.length - 1;
              return (
                <motion.div
                  key={`${res}-${i}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-md border border-white/20 bg-white/5 flex items-center justify-center overflow-hidden"
                  style={{ animation: isLatest ? 'beadPulse 0.8s ease-out 2' : undefined }}
                >
                  {res && (
                    <span className="text-xs font-black text-white/95">
                      {CELL_TEXT[res as keyof typeof CELL_TEXT] ?? ''}
                    </span>
                  )}
                  <span
                    className="absolute inset-0 opacity-10"
                    style={{ backgroundColor: res === 'P' ? '#3b82f6' : res === 'B' ? '#ef4444' : '#22c55e' }}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {visibleHistory.length > 0 && (
        <div className="mt-2 rounded-xl border border-white/15 bg-black/45 px-2 py-1.5">
          <p className="text-[9px] text-white/45 font-black uppercase tracking-[0.14em] mb-1">최근 흐름</p>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {visibleHistory.slice(-14).map((res, index) => (
              <span
                key={`${res}-${index}`}
                className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center border border-white/20"
                style={{
                  background:
                    res === 'P'
                      ? 'rgba(59,130,246,0.3)'
                      : res === 'B'
                        ? 'rgba(239,68,68,0.3)'
                        : 'rgba(34,197,94,0.3)',
                }}
              >
                {res}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-blue-400/30 bg-blue-950/50 px-2 py-2 text-center">
          <p className="text-[10px] text-blue-200 font-black tracking-[0.16em] uppercase">P</p>
          <p className="text-xl font-black text-white/95">{stats.player}</p>
        </div>
        <div className="rounded-xl border border-red-400/30 bg-red-950/50 px-2 py-2 text-center">
          <p className="text-[10px] text-red-200 font-black tracking-[0.16em] uppercase">B</p>
          <p className="text-xl font-black text-white/95">{stats.banker}</p>
        </div>
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/50 px-2 py-2 text-center">
          <p className="text-[10px] text-emerald-200 font-black tracking-[0.16em] uppercase">T</p>
          <p className="text-xl font-black text-white/95">{stats.tie}</p>
        </div>
      </div>
    </div>
  );
};

export const BaccaratRoadmap = React.memo(BaccaratRoadmapComponent);
