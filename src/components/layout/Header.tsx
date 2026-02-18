'use client';

import { cn } from '@/lib/utils';
import { Search, Bell, Menu, Spade } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { MobileMenu } from './MobileMenu';
import { SearchOverlay } from './SearchOverlay';
import { useSession } from '@/components/providers/SessionProvider';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();

  const session = useSession();
  const isLoggedIn = !!session;

  const navLinks = [
    { label: '뉴스', href: '/news' },
    { label: '자유게시판', href: '/board/free' },
    { label: '전략게시판', href: '/board/strategy' },
    { label: '쓰레드', href: '/threads' },
    { label: '핸드공유', href: '/hands' },
    { label: '포커', href: '/poker' },
    { label: '랭킹', href: '/rankings' },
    { label: '복권', href: '/lottery' },
    { label: '룰렛', href: '/roulette' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#1e1e1e] border-b border-[#333]">
        <div className="mx-auto max-w-[1560px] px-4">
          <div className="flex h-14 lg:h-16 items-center justify-between gap-4">
            {/* Left: Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg lg:text-xl text-[#c9a227] hover:text-[#d4af37] transition-colors"
            >
              <Spade className="w-6 h-6" fill="currentColor" />
              <span>PokerHub</span>
            </Link>

            {/* Center: Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-[#e0e0e0] hover:text-[#c9a227] hover:bg-[#2a2a2a] rounded transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#a0a0a0] hover:text-[#c9a227] transition-colors"
                aria-label="검색"
              >
                <Search className="w-5 h-5" />
              </button>

              {isLoggedIn ? (
                <>
                  {/* Notification Bell */}
                  <Link
                    href="/notifications"
                    className="relative min-w-[44px] min-h-[44px] flex items-center justify-center text-[#a0a0a0] hover:text-[#c9a227] transition-colors"
                    aria-label="알림"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#ef4444] rounded-full" />
                  </Link>

                  {/* User Avatar Dropdown */}
                  <div className="relative hidden lg:block">
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="min-w-[44px] min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                      aria-label="사용자 메뉴"
                      aria-expanded={isUserMenuOpen}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#c9a227] flex items-center justify-center text-sm font-bold text-black">
                        {session?.nickname[0].toUpperCase() || 'U'}
                      </div>
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#1e1e1e] border border-[#333] rounded-lg shadow-lg overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#333]">
                          <p className="text-sm font-medium text-[#e0e0e0]">{session?.nickname}</p>
                          <p className="text-xs text-[#a0a0a0] mt-1">{session?.email}</p>
                        </div>
                        <Link
                          href={`/profile/${session?.userId}`}
                          className="block px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors"
                        >
                          내 프로필
                        </Link>
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-sm text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors"
                        >
                          설정
                        </Link>
                        <button
                          onClick={async () => {
                            await fetch('/api/auth/logout', { method: 'POST' });
                            router.push('/login');
                            router.refresh();
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-[#ef4444] hover:bg-[#2a2a2a] transition-colors"
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
                  className="hidden lg:block px-4 py-2 text-sm font-medium bg-[#c9a227] hover:bg-[#d4af37] text-black rounded-md transition-colors"
                >
                  로그인
                </Link>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center text-[#e0e0e0] hover:text-[#c9a227] transition-colors"
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
        navLinks={navLinks}
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
