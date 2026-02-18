export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#e0e0e0] mb-6">개인정보처리방침</h1>
      <div className="bg-[#1a1a1a] rounded-lg p-6 space-y-6 text-[#a0a0a0] text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제1조 (개인정보의 수집 항목 및 수집 방법)</h2>
          <p className="mb-2">PokerHub(이하 &quot;회사&quot;)는 서비스 제공을 위해 필요한 최소한의 개인정보를 수집합니다.</p>
          <p className="font-medium text-[#e0e0e0] mt-3 mb-1">1. 필수 수집 항목</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>이메일 주소, 비밀번호, 닉네임</li>
          </ul>
          <p className="font-medium text-[#e0e0e0] mt-3 mb-1">2. 자동 수집 항목</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>서비스 이용 기록, 접속 일시, IP 주소, 쿠키</li>
          </ul>
          <p className="font-medium text-[#e0e0e0] mt-3 mb-1">3. 수집 방법</p>
          <p className="ml-2">회원가입 시 이용자가 직접 입력, 서비스 이용 과정에서 자동 생성·수집</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제2조 (개인정보의 수집 및 이용 목적)</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>회원 가입 의사 확인 및 회원제 서비스 제공</li>
            <li>이용자 식별 및 본인 인증</li>
            <li>커뮤니티 서비스 운영 및 관리</li>
            <li>서비스 이용 통계 분석 및 서비스 개선</li>
            <li>불법·부정 이용 방지</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제3조 (개인정보의 보유 및 이용 기간)</h2>
          <p className="mb-2">회사는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
          <ul className="list-disc list-inside space-y-1">
            <li>회원 탈퇴 시: 즉시 파기</li>
            <li>단, 관계 법령에 의한 보관 의무가 있는 경우 해당 기간 동안 보관</li>
          </ul>
          <p className="mt-2">- 전자상거래법에 따른 계약·청약철회 기록: 5년</p>
          <p>- 통신비밀보호법에 따른 접속 기록: 3개월</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제4조 (개인정보의 제3자 제공)</h2>
          <p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>이용자가 사전에 동의한 경우</li>
            <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제5조 (개인정보의 안전성 확보 조치)</h2>
          <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>비밀번호의 암호화 저장 및 관리</li>
            <li>개인정보 전송 시 암호화 통신(SSL/TLS) 적용</li>
            <li>개인정보 접근 권한 제한 및 관리</li>
            <li>개인정보 취급 직원의 최소화</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제6조 (이용자의 권리와 그 행사 방법)</h2>
          <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ul>
          <p className="mt-2">위 권리 행사는 서비스 내 설정 페이지 또는 문의하기를 통해 가능합니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제7조 (개인정보 보호책임자)</h2>
          <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 이용자의 불만 처리 및 피해 구제를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
          <div className="bg-[#242424] rounded p-3 mt-2">
            <p>개인정보 보호책임자: PokerHub 운영팀</p>
            <p>문의: support@pokerhub.kr</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">제8조 (개인정보처리방침 변경)</h2>
          <p>이 개인정보처리방침은 시행일로부터 적용되며, 법령·정책 또는 보안 기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 시에는 시행일 최소 7일 전에 서비스 공지사항을 통해 알려드리겠습니다.</p>
        </section>

        <p className="text-[#888] pt-4 border-t border-[#333]">시행일: 2026년 2월 18일</p>
      </div>
    </div>
  );
}
