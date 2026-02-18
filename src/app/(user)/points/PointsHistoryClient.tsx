'use client';

import { ArrowUpRight, ArrowDownRight, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Transaction {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  description: string | null;
  createdAt: Date;
}

interface PointsHistoryClientProps {
  balance: number;
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const TYPE_LABELS: Record<string, string> = {
  earn_post: '게시글 작성',
  earn_comment: '댓글 작성',
  earn_like: '좋아요 받음',
  earn_attendance: '출석 체크',
  earn_mission: '미션 완료',
  earn_game: '게임 보상',
  earn_harvest: '포인트 수확',
  spend_badge: '뱃지 구매',
  spend_custom_title: '커스텀 타이틀',
  spend_game: '게임 베팅',
  admin_adjust: '관리자 조정',
};

export function PointsHistoryClient({
  balance,
  transactions,
  pagination,
}: PointsHistoryClientProps) {
  const totalEarned = transactions
    .filter((tx) => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalSpent = transactions
    .filter((tx) => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-ph-text mb-2">
          포인트 내역
        </h1>
        <p className="text-sm text-ph-text-secondary">
          포인트 획득 및 사용 내역을 확인하세요
        </p>
      </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-br from-ph-gold/20 to-ph-gold/10 border-2 border-ph-gold rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-ph-text-secondary mb-2">현재 보유 포인트</div>
            <div className="flex items-center gap-2">
              <Coins className="w-8 h-8 text-ph-gold" />
              <span className="text-3xl font-bold text-ph-gold">
                {balance.toLocaleString()}
              </span>
              <span className="text-xl text-ph-text-secondary">P</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-ph-surface border border-ph-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-ph-success" />
            <span className="text-xs text-ph-text-secondary">이 페이지 총 획득</span>
          </div>
          <div className="text-lg font-bold text-ph-success">
            +{totalEarned.toLocaleString()} P
          </div>
        </div>
        <div className="bg-ph-surface border border-ph-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-ph-error" />
            <span className="text-xs text-ph-text-secondary">이 페이지 총 사용</span>
          </div>
          <div className="text-lg font-bold text-ph-error">
            -{totalSpent.toLocaleString()} P
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-ph-surface rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-ph-elevated text-sm font-semibold text-ph-text-secondary border-b border-ph-border">
          <div className="col-span-3">날짜</div>
          <div className="col-span-4">내역</div>
          <div className="col-span-2 text-right">변동</div>
          <div className="col-span-3 text-right">잔액</div>
        </div>

        {/* Transaction Rows */}
        <div className="divide-y divide-ph-border">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-4 lg:px-6 py-4 hover:bg-ph-elevated transition-colors"
            >
              {/* Date */}
              <div className="lg:col-span-3 text-xs lg:text-sm text-ph-text-secondary">
                {formatDate(tx.createdAt)}
              </div>

              {/* Description */}
              <div className="lg:col-span-4">
                <div className="text-sm lg:text-base text-ph-text font-medium">
                  {TYPE_LABELS[tx.type] || tx.type}
                </div>
                {tx.description && (
                  <div className="text-xs text-ph-text-muted mt-1">
                    {tx.description}
                  </div>
                )}
              </div>

              {/* Amount Change */}
              <div className="lg:col-span-2 lg:text-right">
                <div
                  className={cn(
                    'inline-flex items-center gap-1 text-sm lg:text-base font-bold',
                    tx.amount > 0 ? 'text-ph-success' : 'text-ph-error'
                  )}
                >
                  {tx.amount > 0 ? (
                    <>
                      <ArrowUpRight className="w-4 h-4" />
                      +{tx.amount.toLocaleString()}
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="w-4 h-4" />
                      {tx.amount.toLocaleString()}
                    </>
                  )}
                </div>
              </div>

              {/* Balance After */}
              <div className="lg:col-span-3 lg:text-right text-sm lg:text-base text-ph-text-secondary">
                {tx.balanceAfter.toLocaleString()} P
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {transactions.length === 0 && (
          <div className="py-12 text-center text-ph-text-muted">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">포인트 내역이 없습니다</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          {pagination.page > 1 && (
            <Link
              href={`/points?page=${pagination.page - 1}`}
              className="px-4 py-2 bg-ph-elevated text-ph-text rounded hover:bg-ph-border transition-colors"
            >
              이전
            </Link>
          )}

          <div className="px-4 py-2 text-sm text-ph-text-secondary">
            {pagination.page} / {pagination.totalPages}
          </div>

          {pagination.page < pagination.totalPages && (
            <Link
              href={`/points?page=${pagination.page + 1}`}
              className="px-4 py-2 bg-ph-elevated text-ph-text rounded hover:bg-ph-border transition-colors"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
