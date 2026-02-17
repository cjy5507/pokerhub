'use client';

import { useRouter } from 'next/navigation';

type RankingType = 'level' | 'points' | 'posts' | 'hands' | 'likes';

interface RankingTab {
  key: RankingType;
  label: string;
}

const RANKING_TABS: RankingTab[] = [
  { key: 'level', label: '경험치' },
  { key: 'points', label: '포인트' },
  { key: 'posts', label: '게시글' },
  { key: 'hands', label: '핸드공유' },
  { key: 'likes', label: '좋아요' },
];

interface RankedUser {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  level: number;
  xp: number;
  points: number;
  postCount: number;
  handCount: number;
  likesReceived: number;
}

interface RankingsClientProps {
  rankedUsers: RankedUser[];
  currentUserId: string | null;
  activeTab: RankingType;
}

export function RankingsClient({ rankedUsers, currentUserId, activeTab }: RankingsClientProps) {
  const router = useRouter();

  const setActiveTab = (tab: RankingType) => {
    router.push(`/rankings?tab=${tab}`);
  };

  // Get metric value for display
  const getMetricValue = (user: RankedUser): string => {
    switch (activeTab) {
      case 'level':
        return user.xp.toLocaleString('ko-KR') + ' XP';
      case 'points':
        return user.points.toLocaleString('ko-KR');
      case 'posts':
        return `${user.postCount}개`;
      case 'hands':
        return `${user.handCount}개`;
      case 'likes':
        return `${user.likesReceived}개`;
      default:
        return '';
    }
  };

  // Get rank text color
  const getRankColor = (rank: number): string => {
    if (rank === 1) return 'text-[#c9a227]';
    if (rank === 2) return 'text-[#c0c0c0]';
    if (rank === 3) return 'text-[#cd7f32]';
    return 'text-[#a0a0a0]';
  };

  return (
    <div className="min-h-screen bg-[#121212] text-[#e0e0e0] pb-20">
      {/* Header */}
      <div className="bg-[#1e1e1e] border-b border-[#333] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-[#e0e0e0]">랭킹</h1>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-[#1e1e1e] border-b border-[#333] sticky top-[60px] z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-8 overflow-x-auto scrollbar-hide">
            {RANKING_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                    ${
                      isActive
                        ? 'text-[#c9a227] border-[#c9a227]'
                        : 'text-[#a0a0a0] border-transparent hover:text-[#e0e0e0]'
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Desktop: Table Layout */}
        <div className="hidden md:block bg-[#1e1e1e] rounded-lg border border-[#333] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#2a2a2a] border-b border-[#333]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#a0a0a0] w-20">순위</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#a0a0a0]">사용자</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-[#a0a0a0] w-24">레벨</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[#a0a0a0] w-32">
                  {RANKING_TABS.find(t => t.key === activeTab)?.label}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {rankedUsers.map((user, index) => {
                const rank = index + 1;
                const isCurrentUser = user.id === currentUserId;

                return (
                  <tr
                    key={user.id}
                    className={`
                      hover:bg-[#2a2a2a] transition-colors
                      ${isCurrentUser ? 'border-l-4 border-l-[#c9a227] bg-[#2a2a2a]/50' : ''}
                    `}
                  >
                    <td className="px-4 py-3">
                      <span className={`text-base font-bold ${getRankColor(rank)}`}>
                        {rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.nickname}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a3a3a] to-[#2a2a2a] flex-shrink-0" />
                        )}
                        {/* Nickname */}
                        <span className={`text-sm font-medium ${rank <= 3 ? getRankColor(rank) : 'text-[#e0e0e0]'}`}>
                          {user.nickname}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-[#a0a0a0]">
                        Lv.{user.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold text-[#e0e0e0]">
                        {getMetricValue(user)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile: Card Layout */}
        <div className="md:hidden space-y-2">
          {rankedUsers.map((user, index) => {
            const rank = index + 1;
            const isCurrentUser = user.id === currentUserId;

            return (
              <div
                key={user.id}
                className={`
                  bg-[#1e1e1e] rounded-lg p-4 border border-[#333]
                  ${isCurrentUser ? 'border-l-4 border-l-[#c9a227] bg-[#2a2a2a]/50' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8">
                    <span className={`text-sm font-bold ${getRankColor(rank)}`}>
                      {rank}
                    </span>
                  </div>
                  {/* Avatar */}
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.nickname}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a3a3a] to-[#2a2a2a] flex-shrink-0" />
                  )}
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${rank <= 3 ? getRankColor(rank) : 'text-[#e0e0e0]'}`}>
                      {user.nickname}
                    </div>
                    <div className="text-xs text-[#a0a0a0] mt-0.5">
                      Lv.{user.level}
                    </div>
                  </div>
                  {/* Metric Value */}
                  <div className="flex-shrink-0">
                    <span className="text-sm font-bold text-[#e0e0e0]">
                      {getMetricValue(user)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
