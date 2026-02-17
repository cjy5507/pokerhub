'use client';

import { cn } from '@/lib/utils';
import { Home, MessageSquare, MessageCircle, MessageSquareMore, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChat } from '@/components/chat/ChatProvider';

export interface MobileBottomNavProps {
  className?: string;
}

const navItems = [
  {
    label: '홈',
    href: '/',
    icon: Home,
  },
  {
    label: '게시판',
    href: '/board/free',
    icon: MessageSquare,
  },
  {
    label: '쓰레드',
    href: '/threads',
    icon: MessageCircle,
  },
  {
    label: '채팅',
    href: null, // Opens drawer instead of navigating
    icon: MessageSquareMore,
  },
  {
    label: '프로필',
    href: '/profile',
    icon: User,
  },
];

export function MobileBottomNav({ className }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { isMobileDrawerOpen, openMobileDrawer } = useChat();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-[#1e1e1e] border-t border-[#333]',
        'lg:hidden',
        className
      )}
      style={{
        height: 'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-[60px]">
        {navItems.map((item) => {
          const isChatButton = item.href === null;
          const isActive = isChatButton
            ? isMobileDrawerOpen
            : (pathname === item.href || pathname?.startsWith(item.href + '/'));
          const Icon = item.icon;

          if (isChatButton) {
            return (
              <button
                key="chat"
                onClick={openMobileDrawer}
                className={cn(
                  'flex flex-col items-center justify-center gap-1',
                  'min-w-[44px] min-h-[44px] transition-colors',
                  'touch-manipulation active:scale-95'
                )}
                aria-label={item.label}
              >
                <Icon
                  className={cn(
                    'w-6 h-6',
                    isActive ? 'text-[#c9a227]' : 'text-[#a0a0a0]'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {isActive && (
                  <span className="text-[10px] font-medium text-[#c9a227]">
                    {item.label}
                  </span>
                )}
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1',
                'min-w-[44px] min-h-[44px] transition-colors',
                'touch-manipulation active:scale-95'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'w-6 h-6',
                    isActive ? 'text-[#c9a227]' : 'text-[#a0a0a0]'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              )}
              {isActive && (
                <span className="text-[10px] font-medium text-[#c9a227]">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
