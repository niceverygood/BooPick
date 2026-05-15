export const metadata = {
  title: "개인정보처리방침 — 부픽",
  description: "부픽(BooPick) 개인정보처리방침",
};

export default function PrivacyPage() {
  return (
    <main className="px-5 py-12 max-w-3xl mx-auto prose prose-slate prose-sm sm:prose-base">
      <h1 className="text-boopick-navy">개인정보처리방침</h1>
      <p className="text-xs text-slate-500">시행일: 2026년 5월 6일</p>

      <p>
        주식회사 바틀(이하 &ldquo;회사&rdquo;)은 「개인정보 보호법」 등 관련
        법령을 준수하며, 이용자의 개인정보를 다음과 같이 안전하게 처리합니다.
      </p>

      <h2>1. 수집하는 개인정보 항목 및 수집 방법</h2>
      <table>
        <thead>
          <tr>
            <th>구분</th>
            <th>항목</th>
            <th>수집 방법</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>회원가입</td>
            <td>이메일, 비밀번호(암호화 저장), 이름</td>
            <td>회원가입 폼 입력</td>
          </tr>
          <tr>
            <td>Pro 결제</td>
            <td>
              대표자명, 연락처, 공인중개사사무소명, 사업자등록번호(선택),
              결제 수단 정보
            </td>
            <td>결제 페이지 입력</td>
          </tr>
          <tr>
            <td>자동 수집</td>
            <td>접속 IP, 브라우저 정보, 쿠키, 서비스 이용 기록</td>
            <td>자동 수집</td>
          </tr>
          <tr>
            <td>이용자 업로드</td>
            <td>매물 데이터셋(.xlsx) — 개인 식별 정보 미포함이 원칙</td>
            <td>대시보드 업로드</td>
          </tr>
        </tbody>
      </table>

      <h2>2. 개인정보 수집 · 이용 목적</h2>
      <ul>
        <li>회원 식별 및 서비스 제공</li>
        <li>결제 처리 및 세금계산서 발행</li>
        <li>고객 문의 응대, 공지사항 전달</li>
        <li>부정 이용 방지 및 서비스 품질 개선</li>
        <li>법령 준수 (전자상거래법, 세법 등)</li>
      </ul>

      <h2>3. 개인정보 보유 및 이용 기간</h2>
      <ul>
        <li>회원 정보: 회원 탈퇴 시까지</li>
        <li>결제 기록: 전자상거래법에 따라 5년 보관</li>
        <li>접속 로그: 통신비밀보호법에 따라 3개월 보관</li>
        <li>
          이용자가 업로드한 매물 데이터셋: 베이직 30일, Pro 영구 (사용자가
          직접 삭제 가능)
        </li>
      </ul>

      <h2>4. 개인정보 제3자 제공</h2>
      <p>
        회사는 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 다음 경우는
        예외로 합니다:
      </p>
      <ul>
        <li>이용자가 사전에 동의한 경우</li>
        <li>법령에 의해 요구되는 경우 (수사기관 영장 등)</li>
      </ul>

      <h2>5. 개인정보 처리 위탁</h2>
      <table>
        <thead>
          <tr>
            <th>수탁사</th>
            <th>위탁 업무</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase Inc. (미국)</td>
            <td>DB · 인증 · 파일 저장 (Postgres / Auth / Storage)</td>
          </tr>
          <tr>
            <td>Vercel Inc. (미국)</td>
            <td>서비스 호스팅 · 서버리스 실행</td>
          </tr>
          <tr>
            <td>Anthropic Inc. (미국)</td>
            <td>AI 자연어 분석 (Claude API). 매물 데이터셋 직접 전송 없음.</td>
          </tr>
          <tr>
            <td>카카오페이 / PG사</td>
            <td>결제 처리 (정식 출시 시점부터 적용)</td>
          </tr>
        </tbody>
      </table>

      <h2>6. 이용자 권리</h2>
      <p>
        이용자는 언제든 개인정보 열람 · 정정 · 삭제 · 처리 정지를 요구할 수
        있으며, 대시보드 또는{" "}
        <a href="mailto:hello@bottle.kr" className="text-boopick-orange">
          hello@bottle.kr
        </a>{" "}
        로 요청할 수 있습니다.
      </p>

      <h2>7. 개인정보 보호 책임자</h2>
      <ul>
        <li>책임자: 한승수 (대표)</li>
        <li>연락처: hello@bottle.kr</li>
      </ul>

      <h2>8. 쿠키 사용</h2>
      <p>
        회사는 서비스 제공 및 로그인 유지를 위해 쿠키를 사용합니다. 이용자는
        브라우저 설정에서 쿠키를 거부할 수 있으나, 이 경우 일부 서비스 이용에
        제한이 있을 수 있습니다.
      </p>

      <h2>9. 변경 사항 고지</h2>
      <p>
        본 방침은 법령 또는 서비스 변경에 따라 개정될 수 있으며, 변경 시 시행
        7일 전 공지합니다.
      </p>

      <p className="text-xs text-slate-500 mt-10">
        본 방침은 2026년 5월 6일부터 시행됩니다.
      </p>
    </main>
  );
}
