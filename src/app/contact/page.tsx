import { Mail } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-ph-text mb-6">문의하기</h1>
      <div className="bg-ph-surface rounded-lg p-6 space-y-6">
        <div className="flex items-center gap-3 text-ph-text-secondary">
          <Mail className="w-5 h-5 text-ph-gold" />
          <p>문의사항이 있으시면 아래 이메일로 연락해주세요.</p>
        </div>
        <div className="bg-ph-elevated rounded-lg p-4">
          <p className="text-ph-text font-medium">support@pokerhub.kr</p>
        </div>
        <div className="text-sm text-ph-text-muted space-y-2">
          <p>운영시간: 평일 10:00 - 18:00 (주말/공휴일 제외)</p>
          <p>답변까지 1~3 영업일이 소요될 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
