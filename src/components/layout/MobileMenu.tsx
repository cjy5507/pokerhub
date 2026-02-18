'use client';

import { cn } from '@/lib/utils';
import { X, User, Settings, LogOut, ChevronDown, Sun, Moon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/components/providers/ThemeProvider';
import type { NavGroup } from './Header';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  navGroups: NavGroup[];
  isLoggedIn: boolean;
  userPoints: number;
  userName?: string;
  userLevel?: number;
  userId?: string;
}

// ---------------------------------------------------------------------------
// MobileMenu
// ---------------------------------------------------------------------------

export function MobileMenu({
  isOpen,
  onClose,
  navGroups,
  isLoggedIn,
  userPoints,
  userName,
  userLevel,
  userId,
}: MobileMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

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

  // Reset expanded group when menu closes
  useEffect(() => {
    if (!isOpen) {
      setExpandedGroup(null);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    onClose();
    router.push('/login');
    router.refresh();
  };

  const toggleGroup = (label: string) => {
    setExpandedGroup((prev) => (prev === label ? null : label));
  };

  const isItemActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

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
          'fixed top-0 left-0 bottom-0 w-[280px] bg-ph-surface z-50 transition-transform duration-300 lg:hidden',
          'flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-ph-border">
          <span className="text-lg font-bold text-ph-gold">메뉴</span>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-ph-text-secondary hover:text-ph-text transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User Section */}
        {isLoggedIn && (
          <div className="px-4 py-4 border-b border-ph-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-ph-gold flex items-center justify-center text-lg font-bold text-ph-text-inverse">
                {userName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium text-ph-text">
                  {userName || '사용자'}
                </p>
                <p className="text-xs text-ph-text-secondary">
                  Lv.{userLevel ?? 1}
                </p>
              </div>
            </div>
            <div className="px-3 py-2 bg-ph-elevated rounded-lg">
              <p className="text-xs text-ph-text-secondary">보유 포인트</p>
              <p className="text-sm font-bold text-ph-gold">
                {userPoints.toLocaleString()}P
              </p>
            </div>
          </div>
        )}

        {/* Navigation – Accordion Groups */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navGroups.map((group) => {
            const hasItems = group.items && group.items.length > 0;
            const isExpanded = expandedGroup === group.label;
            const groupActive = hasItems
              ? group.items!.some((item) => isItemActive(item.href))
              : isItemActive(group.href);

            // Direct link (no sub-items)
            if (!hasItems) {
              return (
                <Link
                  key={group.label}
                  href={group.href}
                  onClick={onClose}
                  className={cn(
                    'block px-4 py-3 text-sm font-medium transition-colors',
                    groupActive
                      ? 'text-ph-gold bg-ph-gold-dim'
                      : 'text-ph-text hover:bg-ph-elevated hover:text-ph-gold'
                  )}
                >
                  {group.label}
                </Link>
              );
            }

            // Accordion group
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors',
                    groupActive
                      ? 'text-ph-gold bg-ph-gold-dim'
                      : 'text-ph-text hover:bg-ph-elevated hover:text-ph-gold'
                  )}
                  aria-expanded={isExpanded}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </button>

                {/* Sub-items */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    isExpanded ? 'max-h-96' : 'max-h-0'
                  )}
                >
                  {group.items!.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'block pl-8 pr-4 py-2.5 text-sm transition-colors',
                        isItemActive(item.href)
                          ? 'text-ph-gold font-medium'
                          : 'text-ph-text-secondary hover:text-ph-gold hover:bg-ph-elevated'
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div className="border-t border-ph-border px-4 py-3">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-2 py-2 text-sm text-ph-text hover:bg-ph-elevated rounded-lg transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>
        </div>

        {/* User Actions */}
        {isLoggedIn ? (
          <div className="border-t border-ph-border py-2">
            <Link
              href={userId ? `/profile/${userId}` : '/settings'}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-sm text-ph-text hover:bg-ph-elevated transition-colors"
            >
              <User className="w-5 h-5" />
              내 프로필
            </Link>
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-3 text-sm text-ph-text hover:bg-ph-elevated transition-colors"
            >
              <Settings className="w-5 h-5" />
              설정
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ph-error hover:bg-ph-elevated transition-colors"
            >
              <LogOut className="w-5 h-5" />
              로그아웃
            </button>
          </div>
        ) : (
          <div className="border-t border-ph-border p-4">
            <Link
              href="/login"
              onClick={onClose}
              className="block w-full px-4 py-3 text-center text-sm font-medium bg-ph-gold hover:bg-ph-gold-hover text-ph-text-inverse rounded-lg transition-colors"
            >
              로그인
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
