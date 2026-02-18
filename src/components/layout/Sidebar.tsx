'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Eye, TrendingUp, ThumbsUp } from 'lucide-react';
import ChatSidebarPanel from '@/components/chat/ChatSidebarPanel';
import { useSession } from '@/components/providers/SessionProvider';

type SidebarProps = {
  popularPosts: { id: string; title: string; likes: number; boardSlug: string }[];
  onlineCount: number;
  userLevel?: number;
};

export default function Sidebar({ popularPosts, onlineCount, userLevel }: SidebarProps) {
  const session = useSession();
  const isLoggedIn = !!session;

  return (
    <aside className="hidden lg:block w-full space-y-4">
      {/* Online Visitors */}
      <div className="bg-[#1e1e1e] rounded-lg p-4 border border-[#333]">
        <div className="flex items-center gap-2 text-sm">
          <Eye className="w-4 h-4 text-[#22c55e]" />
          <span className="text-[#a0a0a0]">접속자</span>
          <span className="font-bold text-[#c9a227]">{onlineCount}명</span>
        </div>
      </div>

      {/* Live Chat Panel */}
      <ChatSidebarPanel />

      {/* User Card (logged in only) */}
      {isLoggedIn ? (
        <div className="bg-[#1e1e1e] rounded-lg p-4 border border-[#333]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#c9a227] flex items-center justify-center text-lg font-bold text-black">
              {session?.nickname[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#e0e0e0]">{session?.nickname}</p>
              <div className="flex items-center gap-1.5">
                <div className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-500/20 text-yellow-400">
                  Lv.{userLevel ?? 1}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Link */}
          <Link
            href={`/profile/${session?.userId}`}
            className="block px-3 py-2 bg-[#2a2a2a] rounded-lg hover:bg-[#333] transition-colors"
          >
            <p className="text-xs text-[#a0a0a0] mb-0.5">프로필에서 자세한 정보 확인</p>
            <p className="text-sm font-medium text-[#c9a227]">내 프로필 보기 →</p>
          </Link>
        </div>
      ) : (
        <div className="bg-[#1e1e1e] rounded-lg p-4 border border-[#333]">
          <p className="text-sm text-[#a0a0a0] mb-3">로그인하여 더 많은 기능을 이용하세요</p>
          <Link
            href="/login"
            className="block w-full px-4 py-2 text-sm font-medium bg-[#c9a227] hover:bg-[#b89220] text-black rounded-lg transition-colors text-center"
          >
            로그인
          </Link>
        </div>
      )}

      {/* Popular Posts */}
      <div className="bg-[#1e1e1e] rounded-lg p-4 border border-[#333]">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-[#c9a227]" />
          <h3 className="text-sm font-semibold text-[#e0e0e0]">인기 글</h3>
        </div>
        <div className="space-y-2">
          {popularPosts.map((post, index) => (
            <Link
              key={post.id}
              href={`/board/${post.boardSlug}/${post.id}`}
              className="block group"
            >
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-bold text-[#c9a227]">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#e0e0e0] group-hover:text-[#c9a227] transition-colors line-clamp-2">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ThumbsUp className="w-3 h-3 text-[#888]" />
                    <span className="text-xs text-[#888]">{post.likes}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
