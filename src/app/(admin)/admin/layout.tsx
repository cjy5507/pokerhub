import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, FileText, BarChart3, ArrowLeft } from 'lucide-react';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.role !== 'admin') {
    redirect('/');
  }

  const navItems = [
    { href: '/admin', label: '대시보드', icon: LayoutDashboard },
    { href: '/admin/users', label: '유저 관리', icon: Users },
    { href: '/admin/posts', label: '게시글 관리', icon: FileText },
    { href: '/admin/stats', label: '통계', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-ph-bg text-ph-text">
      {/* Mobile top nav */}
      <nav className="md:hidden flex items-center gap-1 overflow-x-auto border-b border-ph-border bg-ph-surface px-4 py-2">
        <Link href="/" className="mr-2 shrink-0 text-ph-gold hover:text-ph-gold-hover">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ph-text hover:bg-ph-border hover:text-ph-gold transition-colors"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 border-r border-ph-border bg-ph-surface">
          <div className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 px-4 py-5 border-b border-ph-border">
              <Link href="/" className="text-ph-gold hover:text-ph-gold-hover">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-lg font-bold text-ph-gold">관리자 패널</h1>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ph-text hover:bg-ph-border hover:text-ph-gold transition-colors"
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="border-t border-ph-border px-4 py-3">
            <p className="text-xs text-ph-text-muted">{session.nickname}</p>
            <p className="text-xs text-ph-text-dim">{session.email}</p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 md:ml-56 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
