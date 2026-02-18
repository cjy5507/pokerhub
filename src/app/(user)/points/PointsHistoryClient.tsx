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
        <h1 className="text-2xl lg:text-3xl font-bold text-op-text mb-2">
          포인트 내역
        </h1>
        <p className="text-sm text-op-text-secondary">
          포인트 획득 및 사용 내역을 확인하세요
        </p>
      </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-br from-op-gold/20 to-op-gold/10 border-2 border-op-gold rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-op-text-secondary mb-2">현재 보유 포인트</div>
            <div className="flex items-center gap-2">
              <Coins className="w-8 h-8 text-op-gold" />
              <span className="text-3xl font-bold text-op-gold">
                {balance.toLocaleString()}
              </span>
              <span className="text-xl text-op-text-secondary">P</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-op-surface border border-op-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight className="w-4 h-4 text-op-success" />
            <span className="text-xs text-op-text-secondary">이 페이지 총 획득</span>
          </div>
          <div className="text-lg font-bold text-op-success">
            +{totalEarned.toLocaleString()} P
          </div>
        </div>
        <div className="bg-op-surface border border-op-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownRight className="w-4 h-4 text-op-error" />
            <span className="text-xs text-op-text-secondary">이 페이지 총 사용</span>
          </div>
          <div className="text-lg font-bold text-op-error">
            -{totalSpent.toLocaleString()} P
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-op-surface rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-op-elevated text-sm font-semibold text-op-text-secondary border-b border-op-border">
          <div className="col-span-3">날짜</div>
          <div className="col-span-4">내역</div>
          <div className="col-span-2 text-right">변동</div>
          <div className="col-span-3 text-right">잔액</div>
        </div>

        {/* Transaction Rows */}
        <div className="divide-y divide-op-border">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-4 lg:px-6 py-4 hover:bg-op-elevated transition-colors"
            >
              {/* Date */}
              <div className="lg:col-span-3 text-xs lg:text-sm text-op-text-secondary">
                {formatDate(tx.createdAt)}
              </div>

              {/* Description */}
              <div className="lg:col-span-4">
                <div className="text-sm lg:text-base text-op-text font-medium">
                  {TYPE_LABELS[tx.type] || tx.type}
                </div>
                {tx.description && (
                  <div className="text-xs text-op-text-muted mt-1">
                    {tx.description}
                  </div>
                )}
              </div>

              {/* Amount Change */}
              <div className="lg:col-span-2 lg:text-right">
                <div
                  className={cn(
                    'inline-flex items-center gap-1 text-sm lg:text-base font-bold',
                    tx.amount > 0 ? 'text-op-success' : 'text-op-error'
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
              <div className="lg:col-span-3 lg:text-right text-sm lg:text-base text-op-text-secondary">
                {tx.balanceAfter.toLocaleString()} P
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {transactions.length === 0 && (
          <div className="py-12 text-center text-op-text-muted">
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
              className="px-4 py-2 bg-op-elevated text-op-text rounded hover:bg-op-border transition-colors"
            >
              이전
            </Link>
          )}

          <div className="px-4 py-2 text-sm text-op-text-secondary">
            {pagination.page} / {pagination.totalPages}
          </div>

          {pagination.page < pagination.totalPages && (
            <Link
              href={`/points?page=${pagination.page + 1}`}
              className="px-4 py-2 bg-op-elevated text-op-text rounded hover:bg-op-border transition-colors"
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
