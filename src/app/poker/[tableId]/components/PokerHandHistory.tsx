'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronDown, BookmarkPlus, Loader2 } from 'lucide-react';
import { convertGameHandToHistory } from '@/app/(poker)/actions';

export interface ActionLogEntry {
  id: number;
  text: string;
  timestamp: Date;
}

interface HandHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  actionLog: ActionLogEntry[];
  lastCompletedHandId: string | null;
  isSeated: boolean;
}

export function HandHistorySheet({ isOpen, onClose, actionLog, lastCompletedHandId, isSeated }: HandHistorySheetProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [savedHandId, setSavedHandId] = useState<string | null>(null);

  useEffect(() => {
    setSavedHandId(null);
  }, [lastCompletedHandId]);

  async function handleSaveHand() {
    if (!lastCompletedHandId || isSaving) return;
    setIsSaving(true);
    try {
      const result = await convertGameHandToHistory(lastCompletedHandId);
      if (result.success && result.handId) {
        setSavedHandId(result.handId);
        onClose();
        router.push(`/hands/${result.handId}`);
      } else {
        alert(result.error ?? '저장에 실패했습니다');
      }
    } catch (err: any) {
      alert(err.message ?? '저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={cn('fixed inset-0 z-[150] transition-all duration-300', isOpen ? 'pointer-events-auto' : 'pointer-events-none')}>
      <div
        className={cn('absolute inset-0 bg-black/60 transition-opacity duration-300', isOpen ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-op-elevated rounded-t-2xl transition-transform duration-300 max-h-[60vh] flex flex-col',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/15 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 border-b border-white/8">
          <h3 className="text-sm font-semibold text-white/80">핸드 히스토리</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
        {isSeated && lastCompletedHandId && !savedHandId && (
          <div className="px-4 py-3 border-b border-white/8">
            <button
              onClick={handleSaveHand}
              disabled={isSaving}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]',
                'bg-op-gold hover:opacity-90 text-op-text-inverse',
                isSaving && 'opacity-60 cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" />저장 중...</>
              ) : (
                <><BookmarkPlus className="w-4 h-4" />핸드 저장하기</>
              )}
            </button>
            <p className="text-[10px] text-white/30 text-center mt-1.5">
              마지막 핸드를 핸드 히스토리로 저장합니다
            </p>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
          {actionLog.length === 0 ? (
            <p className="text-xs text-white/25 text-center mt-8">아직 액션이 없습니다</p>
          ) : (
            actionLog.map((entry) => (
              <div key={entry.id} className="text-[11px] text-white/50 py-1 border-b border-white/5">
                {entry.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
