'use client';

import { useState, useEffect, useTransition } from 'react';
import { getAdminUsers, updateUserRole, adjustUserPoints, toggleUserBan } from '../actions';
import { Search, ChevronLeft, ChevronRight, Ban, Coins, X } from 'lucide-react';

type User = {
  id: string;
  nickname: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  status: 'active' | 'suspended' | 'banned' | 'withdrawn';
  level: number;
  points: number;
  xp: number;
  createdAt: Date;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isPending, startTransition] = useTransition();

  // Point adjust modal
  const [pointModal, setPointModal] = useState<{ userId: string; nickname: string } | null>(null);
  const [pointAmount, setPointAmount] = useState('');
  const [pointReason, setPointReason] = useState('');

  const fetchUsers = (p: number, s?: string) => {
    startTransition(async () => {
      const data = await getAdminUsers(p, 20, s || undefined);
      setUsers(data.users as User[]);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    });
  };

  useEffect(() => {
    fetchUsers(page, search);
  }, [page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleRoleChange = (userId: string, role: 'user' | 'admin' | 'moderator') => {
    startTransition(async () => {
      try {
        await updateUserRole(userId, role);
        fetchUsers(page, search);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handleToggleBan = (userId: string) => {
    if (!confirm('이 유저의 상태를 변경하시겠습니까?')) return;
    startTransition(async () => {
      try {
        await toggleUserBan(userId);
        fetchUsers(page, search);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  const handlePointAdjust = () => {
    if (!pointModal || !pointAmount || !pointReason) return;
    const amount = parseInt(pointAmount, 10);
    if (isNaN(amount) || amount === 0) {
      alert('유효한 금액을 입력하세요');
      return;
    }
    startTransition(async () => {
      try {
        await adjustUserPoints(pointModal.userId, amount, pointReason);
        setPointModal(null);
        setPointAmount('');
        setPointReason('');
        fetchUsers(page, search);
      } catch (err: any) {
        alert(err.message);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[#c9a227]">유저 관리</h2>
        <p className="text-sm text-[#888]">총 {total.toLocaleString()}명</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="닉네임 또는 이메일 검색..."
            className="w-full rounded-lg border border-[#333] bg-[#1e1e1e] py-2 pl-10 pr-4 text-sm text-[#e0e0e0] placeholder-[#666] focus:border-[#c9a227] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-medium text-black hover:bg-[#d4af37] transition-colors"
        >
          검색
        </button>
      </form>

      {/* User table */}
      <div className="rounded-xl bg-[#1e1e1e] border border-[#333] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333] text-left text-[#888]">
                <th className="px-4 py-3">닉네임</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">역할</th>
                <th className="px-4 py-3">레벨</th>
                <th className="px-4 py-3">포인트</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">가입일</th>
                <th className="px-4 py-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#333]/50 hover:bg-[#333]/30">
                  <td className="px-4 py-3 font-medium">{user.nickname}</td>
                  <td className="px-4 py-3 text-[#888]">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                      disabled={isPending}
                      className="rounded border border-[#333] bg-[#121212] px-2 py-1 text-xs text-[#e0e0e0] focus:border-[#c9a227] focus:outline-none"
                    >
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">Lv.{user.level}</td>
                  <td className="px-4 py-3 text-[#c9a227]">{user.points.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      user.status === 'suspended' ? 'bg-red-500/20 text-red-400' :
                      'bg-[#333] text-[#888]'
                    }`}>
                      {user.status === 'active' ? '활성' :
                       user.status === 'suspended' ? '정지' :
                       user.status === 'banned' ? '차단' : '탈퇴'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#888]">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPointModal({ userId: user.id, nickname: user.nickname })}
                        title="포인트 조정"
                        className="rounded p-1.5 text-[#888] hover:bg-[#333] hover:text-[#c9a227] transition-colors"
                      >
                        <Coins className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleBan(user.id)}
                        title={user.status === 'suspended' ? '정지 해제' : '정지'}
                        disabled={isPending}
                        className={`rounded p-1.5 transition-colors ${
                          user.status === 'suspended'
                            ? 'text-red-400 hover:bg-red-500/20'
                            : 'text-[#888] hover:bg-[#333] hover:text-red-400'
                        }`}
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#888]">
                    {isPending ? '로딩 중...' : '유저가 없습니다'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isPending}
            className="rounded-lg border border-[#333] p-2 text-[#888] hover:bg-[#333] hover:text-[#e0e0e0] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-[#888]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isPending}
            className="rounded-lg border border-[#333] p-2 text-[#888] hover:bg-[#333] hover:text-[#e0e0e0] disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Point adjust modal */}
      {pointModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl bg-[#1e1e1e] border border-[#333] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">포인트 조정</h3>
              <button onClick={() => setPointModal(null)} className="text-[#888] hover:text-[#e0e0e0]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-[#888] mb-4">대상: <span className="text-[#e0e0e0]">{pointModal.nickname}</span></p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-[#888] mb-1">금액 (양수: 지급, 음수: 차감)</label>
                <input
                  type="number"
                  value={pointAmount}
                  onChange={(e) => setPointAmount(e.target.value)}
                  placeholder="예: 1000 또는 -500"
                  className="w-full rounded-lg border border-[#333] bg-[#121212] px-3 py-2 text-sm text-[#e0e0e0] placeholder-[#666] focus:border-[#c9a227] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-[#888] mb-1">사유</label>
                <input
                  type="text"
                  value={pointReason}
                  onChange={(e) => setPointReason(e.target.value)}
                  placeholder="예: 이벤트 보상"
                  className="w-full rounded-lg border border-[#333] bg-[#121212] px-3 py-2 text-sm text-[#e0e0e0] placeholder-[#666] focus:border-[#c9a227] focus:outline-none"
                />
              </div>
              <button
                onClick={handlePointAdjust}
                disabled={isPending || !pointAmount || !pointReason}
                className="w-full rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-medium text-black hover:bg-[#d4af37] disabled:opacity-50 transition-colors"
              >
                {isPending ? '처리 중...' : '적용'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
