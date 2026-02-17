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
  spend_badge: '뱃지 구매',
  spend_custom_title: '커스텀 타이틀',
  admin_adjust: '관리자 조정',
};

export function PointsHistoryClient({
  balance,
  transactions,
  pagination,
}: PointsHistoryClientProps) {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#e0e0e0] mb-2">
          포인트 내역
        </h1>
        <p className="text-sm text-[#a0a0a0]">
          포인트 획득 및 사용 내역을 확인하세요
        </p>
      </div>

      {/* Current Balance */}
      <div className="bg-gradient-to-br from-[#c9a227]/20 to-[#d4af37]/10 border-2 border-[#c9a227] rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#a0a0a0] mb-2">현재 보유 포인트</div>
            <div className="flex items-center gap-2">
              <Coins className="w-8 h-8 text-[#c9a227]" />
              <span className="text-3xl font-bold text-[#c9a227]">
                {balance.toLocaleString()}
              </span>
              <span className="text-xl text-[#a0a0a0]">P</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-[#1e1e1e] rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-12 gap-4 px-6 py-3 bg-[#2a2a2a] text-sm font-semibold text-[#a0a0a0] border-b border-[#333]">
          <div className="col-span-3">날짜</div>
          <div className="col-span-4">내역</div>
          <div className="col-span-2 text-right">변동</div>
          <div className="col-span-3 text-right">잔액</div>
        </div>

        {/* Transaction Rows */}
        <div className="divide-y divide-[#333]">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-4 lg:px-6 py-4 hover:bg-[#2a2a2a] transition-colors"
            >
              {/* Date */}
              <div className="lg:col-span-3 text-xs lg:text-sm text-[#a0a0a0]">
                {formatDate(tx.createdAt)}
              </div>

              {/* Description */}
              <div className="lg:col-span-4">
                <div className="text-sm lg:text-base text-[#e0e0e0] font-medium">
                  {TYPE_LABELS[tx.type] || tx.type}
                </div>
                {tx.description && (
                  <div className="text-xs text-[#888] mt-1">
                    {tx.description}
                  </div>
                )}
              </div>

              {/* Amount Change */}
              <div className="lg:col-span-2 lg:text-right">
                <div
                  className={cn(
                    'inline-flex items-center gap-1 text-sm lg:text-base font-bold',
                    tx.amount > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
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
              <div className="lg:col-span-3 lg:text-right text-sm lg:text-base text-[#a0a0a0]">
                {tx.balanceAfter.toLocaleString()} P
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {transactions.length === 0 && (
          <div className="py-12 text-center text-[#888]">
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
              className="px-4 py-2 bg-[#2a2a2a] text-[#e0e0e0] rounded hover:bg-[#333] transition-colors"
            >
              이전
            </Link>
          )}

          <div className="px-4 py-2 text-sm text-[#a0a0a0]">
            {pagination.page} / {pagination.totalPages}
          </div>

          {pagination.page < pagination.totalPages && (
            <Link
              href={`/points?page=${pagination.page + 1}`}
              className="px-4 py-2 bg-[#2a2a2a] text-[#e0e0e0] rounded hover:bg-[#333] transition-colors"
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
