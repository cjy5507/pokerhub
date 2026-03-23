import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentDealer, getDealerPhrase } from "@/lib/games/dealers";

export const SuitIcon = ({ suit, className = "w-6 h-6" }: { suit: string; className?: string }) => {
  switch (suit) {
    case "S":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C8 6 4 10 4 14C4 18.418 7.582 22 12 22C16.418 22 20 18.418 20 14C20 10 16 6 12 2Z" />
        </svg>
      );
    case "H":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      );
    case "C":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C10.3431 2 9 3.34315 9 5C9 6.27648 9.80006 7.35987 10.9257 7.78453C9.09885 8.12781 7.2345 8.92203 6.00004 10.7499C4.65434 12.7426 4.96023 15.4284 6.78207 17.0674C8.61864 18.7197 11.3972 18.5985 13.0854 16.788L11.8398 22H12.1601L10.9146 16.788C12.6028 18.5985 15.3813 18.7197 17.2179 17.0674C19.0397 15.4284 19.3456 12.7426 17.9999 10.7499C16.7655 8.92203 14.9011 8.12781 13.0743 7.78453C14.1999 7.35987 15 6.27648 15 5C15 3.34315 13.6568 2 12 2Z" />
        </svg>
      );
    case "D":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 12L12 22L22 12L12 2Z" />
        </svg>
      );
    default:
      return null;
  }
};

export const getSuitColor = (suit: string) =>
  suit === "H" || suit === "D" ? "text-rose-600" : "text-slate-900";

interface BaccaratDealerProps {
  gameState: "waiting" | "betting" | "dealing" | "result";
  timeRemaining: number;
  playerCards: Array<{ suit: string; value: string }>;
  bankerCards: Array<{ suit: string; value: string }>;
  playerScore: number | null;
  bankerScore: number | null;
  revealedCards: number;
}

const DEALER_STAGE_CSS = `
@keyframes dealerAura {
  0% { box-shadow: 0 0 0 0 rgba(56,189,248,0.25); }
  100% { box-shadow: 0 0 0 22px rgba(56,189,248,0); }
}
@keyframes stageDrift {
  0% { transform: translateX(-20%); opacity: 0.18; }
  50% { transform: translateX(10%); opacity: 0.38; }
  100% { transform: translateX(-20%); opacity: 0.18; }
}
@keyframes timerPulse {
  0% { transform: scale(1); }
  100% { transform: scale(1.12); }
}
@keyframes blindPulse {
  0% { opacity: 0.42; }
  100% { opacity: 0.74; }
}
@keyframes labelRise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

const BaccaratDealerComponent: React.FC<BaccaratDealerProps> = ({
  gameState,
  timeRemaining,
  playerCards,
  bankerCards,
  playerScore,
  bankerScore,
  revealedCards,
}) => {
  const isDealing = gameState === "dealing" || gameState === "result";
  const isAnimating =
    gameState === "dealing" && revealedCards < playerCards.length + bankerCards.length;

  const dealer = useMemo(() => getCurrentDealer(), []);
  const phrase = useMemo(() => {
    const state =
      gameState === "result"
        ? playerScore !== null && bankerScore !== null
          ? playerScore > bankerScore
            ? "playerWin"
            : bankerScore > playerScore
              ? "bankerWin"
              : "tie"
          : "betting"
        : gameState === "dealing"
          ? "dealing"
          : "betting";
    return getDealerPhrase(dealer, state);
  }, [gameState, dealer, playerScore, bankerScore]);

  const phaseLabel =
    gameState === "betting"
      ? "베팅 받는 중"
      : gameState === "dealing"
        ? "카드 오픈 중"
        : gameState === "result"
          ? "결과 정산 중"
          : "다음 라운드 준비";

  const winnerLabel =
    gameState === "result" && playerScore !== null && bankerScore !== null
      ? playerScore > bankerScore
        ? "PLAYER WIN"
        : bankerScore > playerScore
          ? "BANKER WIN"
          : "TIE"
      : null;

  return (
    <div className="flex-1 relative flex flex-col justify-center items-center py-4 md:py-6 min-h-[250px] lg:min-h-0 overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: DEALER_STAGE_CSS }} />
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.22), transparent 44%), radial-gradient(circle at 50% 100%, rgba(14,165,233,0.16), transparent 40%)",
          }}
        />
        <div
          className="absolute -inset-x-[18%] top-[10%] h-[42%]"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(56,189,248,0.24), transparent)",
            filter: "blur(24px)",
            animation: "stageDrift 8.5s ease-in-out infinite",
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-1 mb-3">
        <div className="relative">
          {phrase && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full bg-[#0f172a] text-white px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap border border-sky-300/25 shadow-lg z-10">
              {phrase}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2.5 h-2.5 bg-[#0f172a] border-r border-b border-sky-300/20 rotate-45" />
            </div>
          )}
          <div
            className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl border-2"
            style={{
              backgroundColor: `${dealer.color}22`,
              borderColor: dealer.color,
              boxShadow: `0 4px 20px ${dealer.color}40`,
              animation: gameState === "dealing" ? "dealerAura 1s ease-out infinite" : undefined,
            }}
          >
            {dealer.emoji}
          </div>
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-lg md:text-xl">
            {dealer.hat}
          </span>
        </div>
        <span className="text-[10px] font-black" style={{ color: dealer.color }}>
          {dealer.name}
        </span>
      </div>

      <div className="relative z-20 w-full max-w-3xl mb-2 px-3">
        <div className="mx-auto rounded-full border border-white/20 bg-black/45 backdrop-blur px-4 py-1 text-center text-[10px] md:text-xs font-black tracking-[0.18em] uppercase text-white/85" style={{ animation: "labelRise 0.28s ease-out both" }}>
          {phaseLabel}
        </div>
      </div>

      <div className="flex items-center justify-center w-full max-w-4xl mx-auto mt-5 mb-2 md:mb-4 z-20">
        <div className="flex-1 text-right pr-4 md:pr-8 relative">
          <span className="text-2xl md:text-4xl font-black text-sky-300 tracking-tight">PLAYER</span>
          <AnimatePresence>
            {gameState === "result" &&
              playerScore !== null &&
              bankerScore !== null &&
              playerScore > bankerScore && (
                <motion.div
                  initial={{ opacity: 0, scale: 0, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute -top-4 right-6 bg-sky-500 text-black px-3 py-0.5 rounded-full font-black text-[10px] md:text-xs tracking-widest shadow-[0_0_15px_rgba(56,189,248,0.8)] border border-sky-200 z-30"
                >
                  WIN
                </motion.div>
              )}
          </AnimatePresence>
        </div>

        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#0b1220] border-2 border-sky-300/25 flex items-center justify-center shadow-[0_0_24px_rgba(2,6,23,0.9)] relative z-30 shrink-0">
          {gameState === "betting" ? (
            <div className="flex flex-col items-center relative z-10">
              <span
                className="text-xl md:text-2xl font-black text-amber-300 leading-none"
                style={{
                  animation:
                    timeRemaining <= 5 ? "timerPulse 0.45s ease-in-out infinite alternate" : undefined,
                }}
              >
                {timeRemaining}
              </span>
            </div>
          ) : (
            <span className="text-sm font-black text-white/55 italic leading-none">VS</span>
          )}

          {gameState === "betting" && (
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                fill="none"
                stroke="currentColor"
                className="text-amber-300/20"
                strokeWidth="8%"
              />
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                fill="none"
                stroke="currentColor"
                className="text-amber-300 transition-all duration-1000 ease-linear"
                strokeWidth="8%"
                strokeDasharray="290%"
                strokeDashoffset={`${290 - (290 * (timeRemaining / 15))}%`}
              />
            </svg>
          )}
        </div>

        <div className="flex-1 text-left pl-4 md:pl-8 relative">
          <span className="text-2xl md:text-4xl font-black text-rose-300 tracking-tight">BANKER</span>
          <AnimatePresence>
            {gameState === "result" &&
              playerScore !== null &&
              bankerScore !== null &&
              bankerScore > playerScore && (
                <motion.div
                  initial={{ opacity: 0, scale: 0, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="absolute -top-4 left-6 bg-rose-500 text-black px-3 py-0.5 rounded-full font-black text-[10px] md:text-xs tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.8)] border border-rose-200 z-30"
                >
                  WIN
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>

      <div className="dealer-card-stage flex justify-center items-start gap-1 md:gap-4 relative z-10 w-full px-2 max-w-5xl mx-auto mb-3 md:mb-8">
        <div className="absolute inset-x-[6%] top-5 h-28 pointer-events-none rounded-[999px] bg-[#020617]/70 border border-sky-300/20 shadow-[inset_0_0_40px_rgba(2,6,23,0.9),0_0_30px_rgba(56,189,248,0.2)]" />

        <div className="flex justify-end gap-1 md:gap-2 relative min-h-[85px] sm:min-h-[120px] w-[130px] sm:w-[160px] md:w-[240px] shrink-0">
          <AnimatePresence>
            {playerCards.map((card, i) => {
              const dealIndex = i === 0 ? 0 : i === 1 ? 2 : 4;
              const isFlipped = revealedCards > dealIndex;
              return (
                <motion.div
                  key={`p-${i}`}
                  initial={{ opacity: 0, x: 100, y: -250, scale: 0.1, rotateY: 180, rotateZ: 45 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: i === 2 ? 10 : 0,
                    scale: isFlipped ? [1, 1.15, 1] : 1,
                    rotateY: isFlipped ? 0 : 180,
                    rotateZ: i === 2 ? 90 : 0,
                  }}
                  transition={{
                    opacity: { duration: 0.3, delay: dealIndex * 0.15 },
                    x: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                    y: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                    rotateZ: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                    rotateY: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.1], delay: dealIndex * 0.4 },
                    scale: { duration: 0.6, ease: "easeInOut", delay: dealIndex * 0.4 },
                  }}
                  className={cn(
                    "relative w-12 h-[4.5rem] sm:w-14 sm:h-20 md:w-20 md:h-28 shadow-[0_4px_10px_rgba(0,0,0,0.4)] [transform-style:preserve-3d]",
                    isAnimating && "will-change-transform",
                    i === 2 ? "absolute -right-6 sm:-right-8 md:-right-12 top-1 sm:top-2 lg:top-4 z-10" : "z-0",
                  )}
                >
                  <CardFront card={card} />
                  <CardBack />
                </motion.div>
              );
            })}
          </AnimatePresence>
          {playerCards.length === 0 && (
            <div className="flex gap-1 md:gap-2">
              <EmptyCardSlot />
              <EmptyCardSlot />
            </div>
          )}
        </div>

        <div className="flex items-center justify-center px-1 md:px-4 shrink-0 mt-2 md:mt-4">
          <div className="flex items-center gap-2 md:gap-4 bg-[#020617]/80 px-3 md:px-5 py-2 md:py-3 rounded-2xl border border-white/15 shadow-[0_8px_18px_rgba(0,0,0,0.45)]">
            <div
              className={cn(
                "text-2xl md:text-4xl font-black w-10 h-10 md:w-14 md:h-14 flex justify-center items-center rounded-xl shadow-inner border transition-colors",
                playerScore !== null
                  ? "bg-sky-500 text-black border-sky-200"
                  : "bg-slate-900 text-white/30 border-sky-300/20",
              )}
            >
              {isDealing && playerScore !== null
                ? playerScore
                : playerCards.length > 0
                  ? playerScore ?? "?"
                  : "-"}
            </div>
            <span className="text-white/30 text-[10px] md:text-xs font-black italic mt-1 uppercase tracking-widest hidden sm:block">
              SCORE
            </span>
            <div
              className={cn(
                "text-2xl md:text-4xl font-black w-10 h-10 md:w-14 md:h-14 flex justify-center items-center rounded-xl shadow-inner border transition-colors",
                bankerScore !== null
                  ? "bg-rose-500 text-black border-rose-200"
                  : "bg-slate-900 text-white/30 border-rose-300/20",
              )}
            >
              {isDealing && bankerScore !== null
                ? bankerScore
                : bankerCards.length > 0
                  ? bankerScore ?? "?"
                  : "-"}
            </div>
          </div>
        </div>

        <div className="flex justify-start gap-1 md:gap-2 relative min-h-[85px] sm:min-h-[120px] w-[130px] sm:w-[160px] md:w-[240px] shrink-0">
          <AnimatePresence>
            {bankerCards.map((card, i) => {
              const dealIndex = i === 0 ? 1 : i === 1 ? 3 : 5;
              const isFlipped = revealedCards > dealIndex;
              return (
                <motion.div
                  key={`b-${i}`}
                  initial={{ opacity: 0, x: -100, y: -250, scale: 0.1, rotateY: 180, rotateZ: -45 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    y: i === 2 ? 10 : 0,
                    scale: isFlipped ? [1, 1.15, 1] : 1,
                    rotateY: isFlipped ? 0 : 180,
                    rotateZ: i === 2 ? -90 : 0,
                  }}
                  transition={{
                    opacity: { duration: 0.3, delay: dealIndex * 0.15 },
                    x: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                    y: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                    rotateZ: { type: "spring", stiffness: 90, damping: 12, delay: dealIndex * 0.15 },
                    rotateY: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.1], delay: dealIndex * 0.4 },
                    scale: { duration: 0.6, ease: "easeInOut", delay: dealIndex * 0.4 },
                  }}
                  className={cn(
                    "relative w-12 h-[4.5rem] sm:w-14 sm:h-20 md:w-20 md:h-28 shadow-[0_4px_10px_rgba(0,0,0,0.4)] [transform-style:preserve-3d]",
                    isAnimating && "will-change-transform",
                    i === 2 ? "absolute -left-6 sm:-left-8 md:-left-12 top-1 sm:top-2 lg:top-4 z-10" : "z-0",
                  )}
                >
                  <CardFront card={card} />
                  <CardBack />
                </motion.div>
              );
            })}
          </AnimatePresence>
          {bankerCards.length === 0 && (
            <div className="flex gap-1 md:gap-2">
              <EmptyCardSlot />
              <EmptyCardSlot />
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {gameState !== "betting" && (
          <motion.div
            key={`blind-${gameState}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center"
          >
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(15,23,42,0.2),rgba(2,6,23,0.78))]"
              style={{ animation: "blindPulse 1s ease-in-out infinite alternate" }}
            />
            <div className="relative rounded-2xl border border-white/20 bg-black/60 px-5 py-3 text-center backdrop-blur">
              <p className="text-xs font-black tracking-[0.2em] uppercase text-white/75">
                {gameState === "dealing" ? "DEALING" : "RESULT"}
              </p>
              <p className="mt-1 text-sm md:text-base font-black text-white">
                {gameState === "dealing" ? "카드를 오픈하고 있습니다" : winnerLabel ?? "결과 집계 중"}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const BaccaratDealer = React.memo(BaccaratDealerComponent);

const CardFront = ({ card }: { card: { suit: string; value: string } }) => (
  <div
    className={cn(
      "absolute inset-0 rounded-lg [backface-visibility:hidden] bg-white flex flex-col items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.2)] border border-slate-200",
      getSuitColor(card.suit),
    )}
  >
    <span className="absolute top-1 left-1.5 text-xs md:text-sm font-black tracking-tighter">
      {card.value}
    </span>
    <SuitIcon suit={card.suit} className="w-8 h-8 md:w-12 md:h-12 opacity-100" />
    <span className="absolute bottom-1 right-1.5 text-xs md:text-sm font-black tracking-tighter rotate-180">
      {card.value}
    </span>
  </div>
);

const CardBack = () => (
  <div className="absolute inset-0 rounded-lg [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-br from-sky-950 to-slate-950 border-[3px] border-white/20 flex items-center justify-center shadow-md">
    <div className="w-[85%] h-[85%] border-2 border-dashed border-sky-300/35 rounded-md flex items-center justify-center bg-sky-900/35">
      <span className="text-white/60 text-xs font-black tracking-widest opacity-90">VIP</span>
    </div>
  </div>
);

const EmptyCardSlot = () => (
  <div className="w-12 h-[4.5rem] sm:w-14 sm:h-20 md:w-20 md:h-28 border-[1.5px] border-dashed border-white/20 rounded-lg flex items-center justify-center bg-black/35 shadow-inner">
    <span className="text-white/30 text-[9px] sm:text-[10px] md:text-xs uppercase font-black tracking-widest">
      CARD
    </span>
  </div>
);
