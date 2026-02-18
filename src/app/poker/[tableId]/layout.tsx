import { SessionProvider } from '@/components/providers/SessionProvider';
import { getSession } from '@/lib/auth/session';

export default async function PokerTableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <SessionProvider session={session}>
      {/* Full-screen immersive poker layout -- no header, footer, sidebar, or mobile nav */}
      <div className="fixed inset-0 z-[9999] bg-op-deep">
        {children}
      </div>
    </SessionProvider>
  );
}
