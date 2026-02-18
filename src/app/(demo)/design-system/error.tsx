'use client';

export default function DesignSystemError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-ph-bg flex items-center justify-center p-8">
      <div className="bg-ph-surface border border-ph-border rounded-lg p-8 max-w-md text-center">
        <h2 className="text-xl font-bold text-ph-text mb-4">Design System 로딩 실패</h2>
        <p className="text-ph-text-secondary mb-6 text-sm">
          일부 컴포넌트 렌더링 중 오류가 발생했습니다.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2 bg-ph-gold hover:bg-ph-gold-hover text-black font-medium rounded-md transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
