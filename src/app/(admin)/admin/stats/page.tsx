import { getAdminStats } from '../actions';
import { TrendingUp, TrendingDown, Coins } from 'lucide-react';

export default async function AdminStatsPage() {
  const data = await getAdminStats();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#c9a227]">통계</h2>

      {/* Point economy */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#1e1e1e] border border-[#333] p-4">
          <div className="flex items-center gap-3">
            <Coins className="h-8 w-8 text-[#c9a227]" />
            <div>
              <p className="text-xs text-[#888]">총 유통 포인트</p>
              <p className="text-2xl font-bold text-[#c9a227]">{data.pointEconomy.totalCirculation.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-[#1e1e1e] border border-[#333] p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-xs text-[#888]">총 발행량</p>
              <p className="text-2xl font-bold text-green-400">{data.pointEconomy.totalEarned.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-[#1e1e1e] border border-[#333] p-4">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-red-400" />
            <div>
              <p className="text-xs text-[#888]">총 소모량</p>
              <p className="text-2xl font-bold text-red-400">{data.pointEconomy.totalSpent.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily signups */}
      <div className="rounded-xl bg-[#1e1e1e] border border-[#333] p-4">
        <h3 className="text-lg font-semibold mb-4">일별 가입자 (최근 30일)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333] text-left text-[#888]">
                <th className="pb-2 pr-4">날짜</th>
                <th className="pb-2 text-right">가입자 수</th>
              </tr>
            </thead>
            <tbody>
              {data.dailySignups.map((row: any, i: number) => (
                <tr key={i} className="border-b border-[#333]/50 hover:bg-[#333]/30">
                  <td className="py-2 pr-4">{row.date}</td>
                  <td className="py-2 text-right text-[#c9a227] font-medium">{row.count}</td>
                </tr>
              ))}
              {data.dailySignups.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-[#888]">데이터가 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily posts */}
      <div className="rounded-xl bg-[#1e1e1e] border border-[#333] p-4">
        <h3 className="text-lg font-semibold mb-4">일별 게시글 (최근 30일)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#333] text-left text-[#888]">
                <th className="pb-2 pr-4">날짜</th>
                <th className="pb-2 text-right">게시글 수</th>
              </tr>
            </thead>
            <tbody>
              {data.dailyPosts.map((row: any, i: number) => (
                <tr key={i} className="border-b border-[#333]/50 hover:bg-[#333]/30">
                  <td className="py-2 pr-4">{row.date}</td>
                  <td className="py-2 text-right text-[#c9a227] font-medium">{row.count}</td>
                </tr>
              ))}
              {data.dailyPosts.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-[#888]">데이터가 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
