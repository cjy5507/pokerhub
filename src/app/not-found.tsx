import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-[#c9a227] mb-4">404</div>
        <h2 className="text-xl font-bold text-[#e0e0e0] mb-2">페이지를 찾을 수 없습니다</h2>
        <p className="text-sm text-[#a0a0a0] mb-8">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#c9a227] hover:bg-[#d4af37] text-black font-medium rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            홈으로
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] text-[#e0e0e0] font-medium rounded-lg border border-[#333] transition-colors"
          >
            <Search className="w-4 h-4" />
            검색
          </Link>
        </div>
      </div>
    </div>
  );
}
