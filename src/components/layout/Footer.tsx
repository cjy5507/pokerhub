import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-ph-footer border-t border-ph-border mt-auto">
      <div className="mx-auto max-w-[1560px] px-4 py-8">
        {/* Links */}
        <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
          <Link
            href="/terms"
            className="text-ph-text-muted hover:text-ph-gold transition-colors"
          >
            이용약관
          </Link>
          <Link
            href="/privacy"
            className="text-ph-text-muted hover:text-ph-gold transition-colors font-semibold"
          >
            개인정보처리방침
          </Link>
          <Link
            href="/contact"
            className="text-ph-text-muted hover:text-ph-gold transition-colors"
          >
            문의하기
          </Link>
        </div>

        {/* Copyright */}
        <p className="text-center text-xs text-ph-text-dim mb-2">
          © 2026 PokerHub. All rights reserved.
        </p>

        {/* Disclaimer */}
        <p className="text-center text-xs text-ph-text-dim">
          포인트는 현금으로 교환할 수 없습니다.
        </p>
      </div>
    </footer>
  );
}
