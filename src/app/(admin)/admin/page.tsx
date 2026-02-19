import type { Metadata } from 'next';
import { getAdminDashboard } from './actions';

export const metadata: Metadata = {
  title: '관리자 | Open Poker',
  description: '오픈포커 관리자 대시보드.',
};
import { Users, UserPlus, Activity, FileText } from 'lucide-react';

export default async function AdminDashboardPage() {
  const data = await getAdminDashboard();

  const stats = [
    { label: '총 유저', value: data.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-400' },
    { label: '오늘 가입', value: data.todaySignups.toLocaleString(), icon: UserPlus, color: 'text-green-400' },
    { label: '활성 유저 (7일)', value: data.activeUsers.toLocaleString(), icon: Activity, color: 'text-op-gold' },
    { label: '총 게시글', value: data.totalPosts.toLocaleString(), icon: FileText, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <h2 className="text-2xl font-bold text-op-gold">대시보드</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-op-surface border border-op-border p-4">
            <div className="flex items-center gap-3">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-xs text-op-text-muted">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent users */}
      <div className="rounded-xl bg-op-surface border border-op-border p-4">
        <h3 className="text-lg font-semibold mb-4">최근 가입 유저</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-op-border text-left text-op-text-muted">
                <th className="pb-2 pr-4">닉네임</th>
                <th className="pb-2 pr-4">이메일</th>
                <th className="pb-2 pr-4">역할</th>
                <th className="pb-2 pr-4">레벨</th>
                <th className="pb-2 pr-4">포인트</th>
                <th className="pb-2">가입일</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.map((user: { id: string; nickname: string; email: string; role: string; level: number; points: number; createdAt: Date; status: string }) => (
                <tr key={user.id} className="border-b border-op-border/50 hover:bg-op-border/30">
                  <td className="py-2.5 pr-4 font-medium">{user.nickname}</td>
                  <td className="py-2.5 pr-4 text-op-text-muted">{user.email}</td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                      user.role === 'moderator' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-op-border text-op-text-muted'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">Lv.{user.level}</td>
                  <td className="py-2.5 pr-4 text-op-gold">{user.points.toLocaleString()}</td>
                  <td className="py-2.5 text-op-text-muted">
                    {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              ))}
              {data.recentUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-op-text-muted">유저가 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
