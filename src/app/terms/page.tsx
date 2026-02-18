export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-op-text mb-6">이용약관</h1>
      <div className="bg-op-surface rounded-lg p-6 space-y-6 text-op-text-secondary text-sm leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제1조 (목적)</h2>
          <p>이 약관은 Open Poker(이하 &quot;회사&quot;)가 제공하는 온라인 포커 커뮤니티 서비스(이하 &quot;서비스&quot;)의 이용조건 및 절차, 회사와 이용자 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제2조 (정의)</h2>
          <p>1. &quot;서비스&quot;란 회사가 운영하는 Open Poker 포커 커뮤니티 플랫폼 및 관련 제반 서비스를 말합니다.</p>
          <p>2. &quot;이용자&quot;란 이 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</p>
          <p>3. &quot;회원&quot;이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 서비스를 지속적으로 이용할 수 있는 자를 말합니다.</p>
          <p>4. &quot;포인트&quot;란 서비스 이용 과정에서 회사가 정한 기준에 따라 이용자에게 부여하는 가상의 점수를 말합니다.</p>
          <p>5. &quot;게시물&quot;이란 이용자가 서비스를 이용함에 있어 게시한 글, 사진, 댓글 등의 정보를 말합니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제3조 (약관의 효력 및 변경)</h2>
          <p>1. 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
          <p>2. 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경 사유를 명시하여 최소 7일 전에 공지합니다.</p>
          <p>3. 변경된 약관에 동의하지 않는 이용자는 회원 탈퇴를 할 수 있으며, 공지 후 서비스를 계속 이용하는 경우 변경된 약관에 동의한 것으로 봅니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제4조 (회원가입 및 계정)</h2>
          <p>1. 이용자는 회사가 정한 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</p>
          <p>2. 회사는 다음 각 호에 해당하는 신청에 대하여는 승인을 거부하거나 사후에 이용계약을 해지할 수 있습니다.</p>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>타인의 정보를 이용하여 신청한 경우</li>
            <li>허위 정보를 기재하여 신청한 경우</li>
            <li>기타 회원으로 등록하는 것이 서비스 운영에 현저히 지장이 있다고 판단되는 경우</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제5조 (서비스의 제공 및 변경)</h2>
          <p>1. 회사는 다음과 같은 서비스를 제공합니다.</p>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>포커 커뮤니티 게시판 서비스 (자유게시판, 전략게시판, 핸드분석 등)</li>
            <li>포커 관련 뉴스 제공</li>
            <li>포인트 기반 게임 서비스 (복권, 룰렛 등)</li>
            <li>실시간 채팅 서비스</li>
            <li>기타 회사가 정하는 서비스</li>
          </ul>
          <p className="mt-2">2. 회사는 서비스의 내용을 변경할 수 있으며, 변경 시 사전에 공지합니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제6조 (포인트)</h2>
          <p>1. 포인트는 서비스 내 활동(게시글 작성, 출석, 게임 참여 등)을 통해 회사가 정한 기준에 따라 부여됩니다.</p>
          <p>2. 포인트는 현금이나 기타 금전적 가치로 교환할 수 없으며, 오직 서비스 내에서만 사용할 수 있습니다.</p>
          <p>3. 부정한 방법으로 포인트를 획득하거나 비정상적인 방법으로 사용한 경우, 회사는 해당 포인트를 회수하고 이용을 제한할 수 있습니다.</p>
          <p>4. 회원 탈퇴 시 잔여 포인트는 소멸되며 복구되지 않습니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제7조 (이용자의 의무)</h2>
          <p>이용자는 다음 각 호의 행위를 하여서는 안 됩니다.</p>
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li>타인의 개인정보를 도용하거나 부정하게 사용하는 행위</li>
            <li>서비스를 이용하여 불법 도박 또는 사행성 행위를 조장하는 행위</li>
            <li>서비스 운영을 고의로 방해하는 행위</li>
            <li>타인에 대한 비방, 명예훼손, 모욕, 협박 등의 행위</li>
            <li>음란물, 불법 콘텐츠를 게시하는 행위</li>
            <li>회사의 사전 동의 없이 상업적 목적으로 서비스를 이용하는 행위</li>
            <li>자동화 프로그램 등을 이용한 비정상적 서비스 이용 행위</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제8조 (게시물의 관리)</h2>
          <p>1. 이용자의 게시물이 관련 법령에 위반되는 내용을 포함하는 경우, 회사는 사전 통보 없이 해당 게시물을 삭제하거나 비공개 처리할 수 있습니다.</p>
          <p>2. 이용자가 작성한 게시물에 대한 권리와 책임은 이를 게시한 이용자에게 있습니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제9조 (서비스 이용 제한)</h2>
          <p>회사는 이용자가 제7조의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 경고·일시정지·영구이용정지 등의 단계로 서비스 이용을 제한할 수 있습니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제10조 (면책조항)</h2>
          <p>1. 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</p>
          <p>2. 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</p>
          <p>3. 회사는 이용자가 서비스를 이용하여 기대하는 이익을 얻지 못하거나 서비스 자료에 대한 취사선택 또는 이용으로 발생하는 손해에 대해 책임을 지지 않습니다.</p>
          <p>4. 회사는 이용자 간 또는 이용자와 제3자 간에 서비스를 매개로 발생한 분쟁에 대해 개입할 의무가 없으며, 이로 인한 손해를 배상할 책임이 없습니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-op-text mb-3">제11조 (분쟁 해결)</h2>
          <p>1. 회사와 이용자 간에 발생한 분쟁에 대해 이용자는 회사에 이의를 제기할 수 있습니다.</p>
          <p>2. 본 약관에서 정하지 아니한 사항과 이 약관의 해석에 관하여는 대한민국 관계 법령에 따릅니다.</p>
        </section>

        <p className="text-op-text-muted pt-4 border-t border-op-border">시행일: 2026년 2월 18일</p>
      </div>
    </div>
  );
}
