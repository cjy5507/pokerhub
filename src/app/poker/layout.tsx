import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PokerHub - 포인트 포커',
  description: '실시간 텍사스 홀덤 포인트 포커',
};

export default function PokerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
