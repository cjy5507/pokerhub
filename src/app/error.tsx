'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-ph-elevated flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-ph-error" />
        </div>
        <h2 className="text-xl font-bold text-ph-text mb-2">문제가 발생했습니다</h2>
        <p className="text-sm text-ph-text-secondary mb-6">
          일시적인 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-ph-gold hover:bg-ph-gold-hover text-black font-medium rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      </div>
    </div>
  );
}
