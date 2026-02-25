import React from "react";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BaccaratRoadmapProps {
    history: string[];
    gameState: 'waiting' | 'betting' | 'dealing' | 'result';
}

export const BaccaratRoadmap: React.FC<BaccaratRoadmapProps> = ({ history, gameState }) => {
    return (
        <div className="w-full lg:w-[380px] bg-black/80 border-t lg:border-t-0 lg:border-l border-white/10 p-2 md:p-4 shrink-0 flex flex-row lg:flex-col gap-2 md:gap-4 overflow-x-auto lg:overflow-x-visible h-[120px] lg:h-auto scrollbar-hide backdrop-blur-md transition-colors z-20">
            <div className="flex items-center gap-2 text-white/70 px-1 shrink-0 lg:shrink">
                <History className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
                <span className="text-[10px] md:text-sm font-bold uppercase tracking-widest text-white/90">이전 결과</span>
            </div>

            {/* Bead Plate */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-lg p-1.5 min-w-[300px] lg:min-w-0 flex flex-col gap-1 transition-colors shadow-inner overflow-x-auto scrollbar-hide">
                <div className="grid grid-rows-6 grid-flow-col gap-1 h-full w-max py-1">
                    <AnimatePresence>
                        {history.slice(-72).map((res, i) => {
                            const isLatest = gameState === 'result' && i === history.length - 1;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="w-4 h-4 md:w-5 md:h-5 rounded-sm bg-[#111] flex items-center justify-center relative transition-colors"
                                >
                                    {res && (
                                        <div className={cn(
                                            "w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-black text-white shadow-sm transition-all duration-300",
                                            res === 'P' ? "bg-blue-600 shadow-blue-500/50" : res === 'B' ? "bg-red-600 shadow-red-500/50" : "bg-green-600 shadow-green-500/50",
                                            isLatest ? "animate-pulse ring-1 ring-white" : ""
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
            <div className="hidden lg:grid grid-cols-3 gap-2 mt-auto pb-2">
                <div className="bg-blue-900/40 border border-blue-500/20 rounded-md p-2 flex flex-col items-center transition-colors">
                    <span className="text-blue-400 text-[10px] font-bold">플레이어</span>
                    <span className="text-white font-black">{history.filter(x => x === 'P').length}</span>
                </div>
                <div className="bg-red-900/40 border border-red-500/20 rounded-md p-2 flex flex-col items-center transition-colors">
                    <span className="text-red-400 text-[10px] font-bold">뱅커</span>
                    <span className="text-white font-black">{history.filter(x => x === 'B').length}</span>
                </div>
                <div className="bg-green-900/40 border border-green-500/20 rounded-md p-2 flex flex-col items-center transition-colors">
                    <span className="text-green-400 text-[10px] font-bold">타이</span>
                    <span className="text-white font-black">{history.filter(x => x === 'T').length}</span>
                </div>
            </div>
        </div>
    );
};
