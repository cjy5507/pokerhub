import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BaccaratRoadmapProps {
    history: string[];
    gameState: 'waiting' | 'betting' | 'dealing' | 'result';
}

const BaccaratRoadmapComponent: React.FC<BaccaratRoadmapProps> = ({ history, gameState }) => {
    const visibleHistory = useMemo(() => history.slice(-108), [history]);
    const stats = useMemo(() => {
        return visibleHistory.reduce((acc, result) => {
            if (result === 'P') acc.player += 1;
            if (result === 'B') acc.banker += 1;
            if (result === 'T') acc.tie += 1;
            return acc;
        }, { player: 0, banker: 0, tie: 0 });
    }, [visibleHistory]);

    return (
        <div className="w-full h-full flex flex-col pt-2 xl:pt-4 px-2 xl:px-4 shrink-0 gap-2 xl:gap-4 lg:overflow-x-visible xl:overflow-y-auto scrollbar-hide z-20">
            <div className="flex items-center gap-2 text-white/70 px-1 shrink-0">
                <History className="w-4 h-4 xl:w-5 xl:h-5 text-yellow-500" />
                <span className="text-[10px] xl:text-sm font-bold uppercase tracking-widest text-white/90 drop-shadow-md">진매 / 육매 (Roadmap)</span>
            </div>

            {/* Bead Plate Container */}
            <div className="flex-1 bg-gradient-to-br from-[#0a0a0a] to-[#050505] border border-white/10 rounded-xl p-1.5 xl:p-3 min-w-[300px] xl:min-w-0 flex flex-col gap-1 shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)] overflow-x-auto scrollbar-hide mb-2 xl:mb-0">
                {/* Simulated Grid Lines */}
                <div className="grid grid-rows-6 grid-flow-col gap-[2px] w-max h-full min-h-[140px] xl:min-h-0 relative">
                    <AnimatePresence>
                        {visibleHistory.map((res, i) => {
                            const isLatest = gameState === 'result' && i === visibleHistory.length - 1;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-[18px] h-[18px] xl:w-[22px] xl:h-[22px] rounded-[3px] bg-white/5 flex items-center justify-center relative shadow-[inset_0_0_5px_rgba(0,0,0,0.5)]"
                                >
                                    {res && (
                                        <div className={cn(
                                            "w-3.5 h-3.5 xl:w-[18px] xl:h-[18px] rounded-full flex items-center justify-center text-[8px] xl:text-[10px] font-black text-white shadow-md transition-all duration-300",
                                            res === 'P' ? "bg-gradient-to-br from-blue-400 to-blue-700" : res === 'B' ? "bg-gradient-to-br from-red-400 to-red-700" : "bg-gradient-to-br from-green-400 to-green-700",
                                            isLatest ? "animate-pulse ring-2 ring-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.8)]" : ""
                                        )}>
                                            {res}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="hidden xl:grid grid-cols-3 gap-3 mt-auto pb-4">
                <div className="bg-gradient-to-b from-[#0a192f]/80 to-[#020c1b]/90 border border-[#3b82f6]/30 rounded-lg p-3 flex flex-col items-center shadow-lg">
                    <span className="text-[#93c5fd] text-xs font-bold uppercase tracking-widest mb-1">플레이어</span>
                    <span className="text-white font-black text-2xl drop-shadow-md">{stats.player}</span>
                </div>
                <div className="bg-gradient-to-b from-[#450a0a]/80 to-[#270303]/90 border border-[#ef4444]/30 rounded-lg p-3 flex flex-col items-center shadow-lg">
                    <span className="text-[#fca5a5] text-xs font-bold uppercase tracking-widest mb-1">뱅커</span>
                    <span className="text-white font-black text-2xl drop-shadow-md">{stats.banker}</span>
                </div>
                <div className="bg-gradient-to-b from-[#052e16]/80 to-[#02180b]/90 border border-[#22c55e]/30 rounded-lg p-3 flex flex-col items-center shadow-lg">
                    <span className="text-[#86efac] text-xs font-bold uppercase tracking-widest mb-1">타이</span>
                    <span className="text-white font-black text-2xl drop-shadow-md">{stats.tie}</span>
                </div>
            </div>
        </div>
    );
};

export const BaccaratRoadmap = React.memo(BaccaratRoadmapComponent);
