export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#e0e0e0] mb-6">이용약관</h1>
      <div className="bg-[#1a1a1a] rounded-lg p-6 space-y-6 text-[#a0a0a0] text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제1조 (목적)</h2>
          <p>이 약관은 PokerHub(이하 &quot;서비스&quot;)가 제공하는 온라인 포커 커뮤니티 서비스의 이용조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제2조 (정의)</h2>
          <p>1. &quot;서비스&quot;란 PokerHub가 제공하는 포커 커뮤니티 플랫폼을 말합니다.</p>
          <p>2. &quot;회원&quot;이란 서비스에 가입하여 이용계약을 체결한 자를 말합니다.</p>
          <p>3. &quot;포인트&quot;란 서비스 내에서 활동에 따라 부여되는 가상의 점수를 말합니다.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제3조 (포인트)</h2>
          <p>1. 포인트는 서비스 내 활동(게시글 작성, 출석, 게임 참여 등)을 통해 획득할 수 있습니다.</p>
          <p>2. 포인트는 현금으로 교환할 수 없으며, 오직 서비스 내에서만 사용 가능합니다.</p>
          <p>3. 부정한 방법으로 포인트를 획득한 경우, 서비스는 해당 포인트를 회수할 수 있습니다.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제4조 (이용자의 의무)</h2>
          <p>1. 이용자는 타인의 권리를 침해하는 행위를 해서는 안 됩니다.</p>
          <p>2. 불법 도박, 사행성 조장 등의 행위를 해서는 안 됩니다.</p>
          <p>3. 서비스의 운영을 방해하는 행위를 해서는 안 됩니다.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제5조 (면책)</h2>
          <p>1. 서비스는 무료로 제공되며, 서비스 이용으로 발생한 손해에 대해 책임지지 않습니다.</p>
          <p>2. 서비스는 이용자가 게재한 정보의 신뢰성, 정확성에 대해 보증하지 않습니다.</p>
        </section>
        <p className="text-[#888] pt-4 border-t border-[#333]">시행일: 2026년 2월 18일</p>
      </div>
    </div>
  );
}
