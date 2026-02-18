'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TrendingUp, ThumbsUp } from 'lucide-react';
import ChatSidebarPanel from '@/components/chat/ChatSidebarPanel';
import { useSession } from '@/components/providers/SessionProvider';

type SidebarProps = {
  popularPosts: { id: string; title: string; likes: number; boardSlug: string }[];
  onlineCount: number;
  todayPosts: number;
  userLevel?: number;
};

function SidebarLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={cn(
        'block px-2.5 py-1.5 rounded text-sm transition-colors',
        isActive
          ? 'bg-op-gold-dim text-op-gold font-medium'
          : 'text-op-text-secondary hover:text-op-text hover:bg-op-elevated'
      )}
    >
      {label}
    </Link>
  );
}

export default function Sidebar({ popularPosts, onlineCount, todayPosts, userLevel }: SidebarProps) {
  const session = useSession();
  const isLoggedIn = !!session;

  return (
    <aside className="hidden lg:block w-full space-y-4">
      {/* 1. User Card or Login CTA */}
      {isLoggedIn ? (
        <div className="bg-op-surface rounded-lg p-4 border border-op-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-op-gold flex items-center justify-center text-lg font-bold text-op-text-inverse">
              {session?.nickname[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-op-text">{session?.nickname}</p>
              <div className="flex items-center gap-1.5">
                <div className="px-1.5 py-0.5 rounded text-xs font-bold bg-op-gold-dim text-op-gold">
                  Lv.{userLevel ?? 1}
                </div>
              </div>
            </div>
          </div>

          <Link
            href={`/profile/${session?.userId}`}
            className="block px-3 py-2 bg-op-elevated rounded-lg hover:bg-op-border transition-colors"
          >
            <p className="text-xs text-op-text-muted mb-0.5">프로필에서 자세한 정보 확인</p>
            <p className="text-sm font-medium text-op-gold">내 프로필 보기 →</p>
          </Link>
        </div>
      ) : (
        <div className="bg-op-surface rounded-lg p-4 border border-op-border">
          <p className="text-sm text-op-text-muted mb-3">로그인하여 더 많은 기능을 이용하세요</p>
          <Link
            href="/login"
            className="block w-full px-4 py-2 text-sm font-medium bg-op-gold hover:bg-op-gold-hover text-op-text-inverse rounded-lg transition-colors text-center"
          >
            로그인
          </Link>
        </div>
      )}

      {/* 2. Real-time Chat Panel (replaces board directory) */}
      <ChatSidebarPanel />

      {/* Board Directory - hidden
      <div className="bg-op-surface rounded-lg p-4 border border-op-border">
        <h3 className="text-sm font-semibold text-op-text mb-3">게시판</h3>
        <div className="space-y-1">
          <SidebarLink href="/board/free" label="자유게시판" />
          <SidebarLink href="/board/strategy" label="전략게시판" />
          <SidebarLink href="/hands" label="핸드공유" />
          <SidebarLink href="/board/notice" label="공지사항" />
        </div>
        <div className="mt-3 pt-3 border-t border-op-border space-y-1">
          <SidebarLink href="/threads" label="쓰레드" />
          <SidebarLink href="/poker" label="포인트포커" />
          <SidebarLink href="/rankings" label="랭킹" />
        </div>
      </div>
      */}

      {/* 3. Popular Posts (8 items) */}
      <div className="bg-op-surface rounded-lg p-4 border border-op-border">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-op-gold" />
          <h3 className="text-sm font-semibold text-op-text">인기 글</h3>
        </div>
        <div className="space-y-1.5">
          {popularPosts.map((post, index) => (
            <Link
              key={post.id}
              href={`/board/${post.boardSlug}/${post.id}`}
              className="block group"
            >
              <div className="flex items-start gap-2 py-0.5">
                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-bold text-op-gold">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-op-text group-hover:text-op-gold transition-colors line-clamp-1">
                    {post.title}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ThumbsUp className="w-3 h-3 text-op-text-muted" />
                    <span className="text-xs text-op-text-muted">{post.likes}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 4. Stats Widget */}
      <div className="bg-op-surface rounded-lg p-4 border border-op-border">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-op-gold">{onlineCount}</p>
            <p className="text-xs text-op-text-muted">접속자</p>
          </div>
          <div>
            <p className="text-lg font-bold text-op-text">{todayPosts}</p>
            <p className="text-xs text-op-text-muted">오늘 글</p>
          </div>
        </div>
      </div>

    </aside>
  );
}
