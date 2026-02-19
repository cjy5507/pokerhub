import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '문의하기 | Open Poker',
  description: 'Open Poker 팀에 문의사항을 남겨주세요.',
};

import { Mail } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-op-text mb-6">문의하기</h1>
      <div className="bg-op-surface rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-3 text-op-text-secondary">
          <Mail className="w-5 h-5 text-op-gold" />
          <p>문의사항이 있으시면 아래 이메일로 연락해주세요.</p>
        </div>
        <div className="bg-op-elevated rounded-lg p-4">
          <p className="text-op-text font-medium">support@openpoker.kr</p>
        </div>
        <div className="text-sm text-op-text-muted space-y-2">
          <p>운영시간: 평일 10:00 - 18:00 (주말/공휴일 제외)</p>
          <p>답변까지 1~3 영업일이 소요될 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
