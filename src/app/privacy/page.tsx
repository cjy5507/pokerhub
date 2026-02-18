export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#e0e0e0] mb-6">개인정보처리방침</h1>
      <div className="bg-[#1a1a1a] rounded-lg p-6 space-y-6 text-[#a0a0a0] text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">1. 수집하는 개인정보</h2>
          <p>PokerHub는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>이메일 주소 (회원가입, 로그인)</li>
            <li>닉네임 (서비스 내 식별)</li>
            <li>비밀번호 (암호화 저장)</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">2. 개인정보의 이용 목적</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>회원 식별 및 서비스 제공</li>
            <li>커뮤니티 운영 및 관리</li>
            <li>서비스 개선 및 통계 분석</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">3. 개인정보의 보관 기간</h2>
          <p>회원 탈퇴 시 즉시 파기합니다. 단, 관련 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">4. 개인정보의 제3자 제공</h2>
          <p>PokerHub는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">5. 개인정보의 안전성 확보</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>비밀번호는 bcrypt로 암호화하여 저장합니다</li>
            <li>JWT 토큰 기반 인증으로 세션을 보호합니다</li>
            <li>HTTPS를 통한 데이터 전송 암호화</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">6. 문의</h2>
          <p>개인정보 관련 문의는 문의하기 페이지를 이용해주세요.</p>
        </section>
        <p className="text-[#888] pt-4 border-t border-[#333]">시행일: 2026년 2월 18일</p>
      </div>
    </div>
  );
}
