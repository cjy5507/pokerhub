'use client';

import { cn } from '@/lib/utils';
import { Search, Bell, Menu, Spade, ChevronDown, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useCallback, useEffect } from 'react';
import { MobileMenu } from './MobileMenu';
import { SearchOverlay } from './SearchOverlay';
import { useSession } from '@/components/providers/SessionProvider';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useRouter, usePathname } from 'next/navigation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NavGroup {
  label: string;
  href: string;
  items?: { label: string; href: string }[];
}

// ---------------------------------------------------------------------------
// Shared nav structure
// ---------------------------------------------------------------------------

const navGroups: NavGroup[] = [
  { label: '뉴스', href: '/news' },
  {
    label: '게시판',
    href: '/board/free',
    items: [
      { label: '자유게시판', href: '/board/free' },
      { label: '전략게시판', href: '/board/strategy' },
      { label: '전략 허브', href: '/strategy' },
    ],
  },
  {
    label: '포커',
    href: '/hands',
    items: [
      { label: '핸드공유', href: '/hands' },
      { label: '포인트포커', href: '/poker' },
    ],
  },
  {
    label: '소셜',
    href: '/threads',
    items: [
      { label: '쓰레드', href: '/threads' },
      { label: '채팅', href: '/chat' },
      { label: '마켓', href: '/market' },
      { label: '랭킹', href: '/rankings' },
    ],
  },
  {
    label: '게임',
    href: '/lottery',
    items: [
      { label: '복권', href: '/lottery' },
      { label: '룰렛', href: '/roulette' },
      { label: '바카라', href: '/baccarat/vip-room' },
      { label: '포인트샵', href: '/shop' },
    ],
  },
];

// ---------------------------------------------------------------------------
// NavDropdown – desktop hover dropdown
// ---------------------------------------------------------------------------

function NavDropdown({
  group,
  isActive,
}: {
  group: NavGroup;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimer();
    if (group.items) setOpen(true);
  }, [clearTimer, group.items]);

  const handleMouseLeave = useCallback(() => {
    clearTimer();
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  }, [clearTimer]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // No sub-items – simple link
  if (!group.items) {
    return (
      <Link
        href={group.href}
        className={cn(
          'px-3 py-2 text-sm font-medium transition-colors rounded',
          isActive
            ? 'text-op-gold font-semibold border-b-2 border-op-gold'
            : 'text-op-text hover:text-op-gold hover:bg-op-elevated'
        )}
      >
        {group.label}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link
        href={group.href}
        className={cn(
          'flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded',
          isActive
            ? 'text-op-gold font-semibold border-b-2 border-op-gold'
            : 'text-op-text hover:text-op-gold hover:bg-op-elevated'
        )}
      >
        {group.label}
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform',
            open && 'rotate-180'
          )}
        />
      </Link>

      {/* Dropdown panel */}
      <div
        className={cn(
          'absolute top-full left-0 mt-1 min-w-[160px] bg-op-surface border border-op-border rounded-lg shadow-lg overflow-hidden transition-all',
          open
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-1 pointer-events-none'
        )}
      >
        {group.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block px-4 py-2.5 text-sm text-op-text hover:bg-op-elevated hover:text-op-gold transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper – check if a nav group is active based on the current pathname
// ---------------------------------------------------------------------------

function isGroupActive(group: NavGroup, pathname: string): boolean {
  // Direct match
  if (pathname === group.href) return true;

  // Check sub-items
  if (group.items) {
    return group.items.some(
      (item) =>
        pathname === item.href || pathname.startsWith(item.href + '/')
    );
  }

  // Prefix match for direct links (e.g. /news/xxx)
  return pathname.startsWith(group.href + '/');
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  const session = useSession();
  const isLoggedIn = !!session;

  return (
    <>
      <header className="sticky top-0 z-40 bg-op-header border-b border-op-border">
        <div className="mx-auto max-w-[1560px] px-4">
          <div className="flex h-14 lg:h-16 items-center justify-between gap-4">
            {/* Left: Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg lg:text-xl text-op-gold hover:text-op-gold-hover transition-colors"
            >
              <Spade className="w-6 h-6" fill="currentColor" />
              <span>Open Poker</span>
            </Link>

            {/* Center: Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navGroups.map((group) => (
                <NavDropdown
                  key={group.label}
                  group={group}
                  isActive={isGroupActive(group, pathname)}
                />
              ))}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-op-text-secondary hover:text-op-gold transition-colors"
                aria-label="테마 변경"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              {/* Search Button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-op-text-secondary hover:text-op-gold transition-colors"
                aria-label="검색"
              >
                <Search className="w-5 h-5" />
              </button>

              {isLoggedIn ? (
                <>
                  {/* Notification Bell */}
                  <Link
                    href="/notifications"
                    className="relative min-w-[44px] min-h-[44px] flex items-center justify-center text-op-text-secondary hover:text-op-gold transition-colors"
                    aria-label="알림"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-op-error rounded-full" />
                  </Link>

                  {/* User Avatar Dropdown */}
                  <div className="relative hidden lg:block">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="min-w-[44px] min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-op-elevated transition-colors"
                      aria-label="사용자 메뉴"
                      aria-expanded={isUserMenuOpen}
                    >
                      <div className="w-8 h-8 rounded-full bg-op-gold flex items-center justify-center text-sm font-bold text-op-text-inverse">
                        {session?.nickname[0].toUpperCase() || 'U'}
                      </div>
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-op-surface border border-op-border rounded-lg shadow-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-op-border">
                          <p className="text-sm font-medium text-op-text">
                            {session?.nickname}
                          </p>
                          <p className="text-xs text-op-text-secondary mt-1">
                            {session?.email}
                          </p>
                        </div>
                        <Link
                          href={`/profile/${session?.userId}`}
                          className="block px-4 py-2 text-sm text-op-text hover:bg-op-elevated transition-colors"
                        >
                          내 프로필
                        </Link>
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-sm text-op-text hover:bg-op-elevated transition-colors"
                        >
                          설정
                        </Link>
                        <button
                          onClick={async () => {
                            await fetch('/api/auth/logout', { method: 'POST' });
                            router.push('/login');
                            router.refresh();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-op-error hover:bg-op-elevated transition-colors"
                        >
                          로그아웃
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <Link
                  href="/login"
                  className="hidden lg:block px-4 py-2 text-sm font-medium bg-op-gold hover:bg-op-gold-hover text-op-text-inverse rounded-md transition-colors"
                >
                  로그인
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-op-text hover:text-op-gold transition-colors"
                aria-label="메뉴 열기"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navGroups={navGroups}
        isLoggedIn={isLoggedIn}
        userPoints={0}
        userName={session?.nickname}
        userLevel={1}
        userId={session?.userId}
      />

      <SearchOverlay
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
}
