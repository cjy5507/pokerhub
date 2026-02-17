'use client';

import { cn } from '@/lib/utils';
import { X, User, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: Array<{ label: string; href: string }>;
  isLoggedIn: boolean;
  userPoints: number;
}

export function MobileMenu({
  isOpen,
  onClose,
  navLinks,
  isLoggedIn,
  userPoints,
}: MobileMenuProps) {
  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 z-50 transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Menu */}
      <div
        className={cn(
          'fixed top-0 left-0 bottom-0 w-[280px] bg-[#1e1e1e] z-50 transition-transform duration-300 lg:hidden',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#333]">
          <span className="text-lg font-bold text-[#c9a227]">메뉴</span>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#a0a0a0] hover:text-[#e0e0e0] transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Section */}
        {isLoggedIn && (
          <div className="px-4 py-4 border-b border-[#333]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-[#c9a227] flex items-center justify-center text-lg font-bold text-black">
                U
              </div>
              <div>
                <p className="text-sm font-medium text-[#e0e0e0]">사용자명</p>
                <p className="text-xs text-[#a0a0a0]">Lv.15</p>
              </div>
            </div>
            <div className="px-3 py-2 bg-[#2a2a2a] rounded-lg">
              <p className="text-xs text-[#a0a0a0]">보유 포인트</p>
              <p className="text-sm font-bold text-[#c9a227]">
                {userPoints.toLocaleString()}P
              </p>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="block px-4 py-3 text-sm font-medium text-[#e0e0e0] hover:bg-[#2a2a2a] hover:text-[#c9a227] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User Actions */}
        {isLoggedIn ? (
          <div className="border-t border-[#333] py-2">
            <Link
              href="/profile/me"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-sm text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors"
            >
              <User className="w-5 h-5" />
              내 프로필
            </Link>
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-sm text-[#e0e0e0] hover:bg-[#2a2a2a] transition-colors"
            >
              <Settings className="w-5 h-5" />
              설정
            </Link>
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#ef4444] hover:bg-[#2a2a2a] transition-colors"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          </div>
        ) : (
          <div className="border-t border-[#333] p-4">
            <Link
              href="/login"
              onClick={onClose}
              className="block w-full px-4 py-3 text-center text-sm font-medium bg-[#c9a227] hover:bg-[#d4af37] text-black rounded-lg transition-colors"
            >
              로그인
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
