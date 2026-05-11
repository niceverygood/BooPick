// 부픽 소개서 PDF 생성기
//
// 6페이지 브랜드 브로셔:
//   1. 표지
//   2. 부픽이 뭔가요? + 일반 vs 부픽
//   3. 5단계 흐름
//   4. 산업 관점 분석 (Pro 차별화)
//   5. 티어 비교 + 베타 안내
//   6. 시작하기 + 보안 + 문의
//
// 실행: npx tsx scripts/build-intro-pdf.ts

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import puppeteer from "puppeteer";

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, "docs", "brochure");
const OUT_FILE = join(OUT_DIR, "부픽_소개서.pdf");

async function buildHTML(): Promise<string> {
  // 아이콘 base64 — PDF에 외부 자원 없이 임베드
  const iconBuf = await readFile(join(ROOT, "public", "img", "icon-512.png"));
  const iconB64 = `data:image/png;base64,${iconBuf.toString("base64")}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>부픽 소개서</title>
<style>
  :root {
    --navy: #0F172A;
    --navy-light: #1A2E4C;
    --orange: #B45309;
    --orange-light: #FF8E61;
    --cream: #FFFBEB;
    --cream-soft: #FEF9F0;
    --border: #FDE68A;
    --text: #1F2937;
    --muted: #64748B;
    --faint: #94A3B8;
    --bg-soft: #F8FAFC;
    --green: #16A34A;
  }

  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'Noto Sans CJK KR', 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
    color: var(--text);
    font-size: 10pt;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .page {
    page-break-after: always;
    page-break-inside: avoid;
    position: relative;
  }
  .page:last-child { page-break-after: auto; }

  /* ─────────────── 표지 ─────────────── */
  .cover {
    text-align: center;
    padding-top: 50mm;
  }
  .cover .icon {
    width: 100pt;
    height: 100pt;
    border-radius: 22pt;
    margin: 0 auto 24pt;
    display: block;
  }
  .cover .label {
    font-size: 9pt;
    letter-spacing: 8pt;
    color: var(--orange);
    font-weight: 600;
    margin-bottom: 14pt;
  }
  .cover .title {
    font-size: 36pt;
    font-weight: 800;
    color: var(--navy);
    line-height: 1.2;
    margin-bottom: 16pt;
    letter-spacing: -1pt;
  }
  .cover .accent-bar {
    width: 60pt;
    height: 4pt;
    background: var(--orange);
    margin: 0 auto 18pt;
    border-radius: 2pt;
  }
  .cover .subtitle {
    font-size: 13pt;
    color: var(--muted);
    margin-bottom: 8pt;
  }
  .cover .hero {
    margin-top: 40pt;
    padding: 18pt 24pt;
    background: var(--bg-soft);
    border-radius: 6pt;
    display: inline-block;
    text-align: left;
  }
  .cover .hero-num {
    font-size: 32pt;
    font-weight: 800;
    color: var(--orange);
    letter-spacing: -1pt;
  }
  .cover .hero-text {
    font-size: 13pt;
    color: var(--text);
    margin-top: 4pt;
  }
  .cover .footer-line {
    margin-top: 60pt;
    font-size: 10pt;
    color: var(--muted);
  }
  .cover .footer-line strong {
    color: var(--navy);
    font-weight: 700;
  }

  /* ─────────────── 일반 본문 헤더 ─────────────── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2pt solid var(--navy);
    padding-bottom: 8pt;
    margin-bottom: 22pt;
  }
  .page-header h2 {
    font-size: 18pt;
    color: var(--navy);
    font-weight: 700;
    letter-spacing: -0.4pt;
  }
  .page-num {
    font-size: 9pt;
    color: var(--muted);
    letter-spacing: 1pt;
    font-variant-numeric: tabular-nums;
  }
  .page-header .label {
    font-size: 9pt;
    color: var(--orange);
    letter-spacing: 4pt;
    font-weight: 600;
    margin-bottom: 4pt;
  }

  /* ─────────────── 강조 box ─────────────── */
  .lead {
    font-size: 13pt;
    color: var(--text);
    line-height: 1.7;
    margin-bottom: 22pt;
  }
  .lead strong { color: var(--navy); font-weight: 700; }

  /* ─────────────── 비교 표 ─────────────── */
  .compare {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    margin-bottom: 18pt;
  }
  .compare th, .compare td {
    border: 0.5pt solid #E2E8F0;
    padding: 9pt 12pt;
    vertical-align: top;
    text-align: left;
  }
  .compare thead th {
    background: var(--navy);
    color: white;
    font-weight: 700;
    font-size: 10pt;
  }
  .compare thead th.col-best { background: var(--orange); }
  .compare .legacy { color: var(--muted); }
  .compare .boopick { background: var(--cream); color: var(--navy); font-weight: 600; }
  .compare .row-label {
    background: var(--bg-soft);
    color: var(--muted);
    font-weight: 600;
    width: 28%;
  }

  /* ─────────────── 흐름 카드 ─────────────── */
  .flow-grid {
    display: table;
    width: 100%;
    border-spacing: 6pt 0;
    margin: 18pt 0;
  }
  .flow-row {
    display: table-row;
  }
  .flow-step {
    display: table-cell;
    width: 20%;
    background: var(--cream);
    border: 1pt solid var(--border);
    border-radius: 5pt;
    padding: 12pt 10pt;
    vertical-align: top;
  }
  .flow-num {
    display: inline-block;
    background: var(--orange);
    color: white;
    font-size: 9pt;
    font-weight: 800;
    padding: 1pt 6pt;
    border-radius: 8pt;
    margin-bottom: 6pt;
  }
  .flow-title {
    font-size: 10.5pt;
    font-weight: 700;
    color: var(--navy);
    margin-bottom: 4pt;
  }
  .flow-desc {
    font-size: 8.5pt;
    color: var(--text);
    line-height: 1.5;
  }
  .flow-arrow {
    text-align: center;
    color: var(--orange);
    font-size: 14pt;
    font-weight: 700;
    margin: 10pt 0;
  }

  /* ─────────────── 산업 분석 박스 (Pro 차별화) ─────────────── */
  .biz {
    background: linear-gradient(to right, var(--cream) 0%, var(--cream-soft) 100%);
    border: 1.5pt solid var(--border);
    border-radius: 6pt;
    padding: 14pt 18pt;
    margin-bottom: 14pt;
  }
  .biz-header {
    font-size: 10.5pt;
    font-weight: 700;
    color: var(--orange);
    margin-bottom: 4pt;
  }
  .biz-headline {
    font-size: 12pt;
    font-weight: 700;
    color: var(--navy);
    border-bottom: 1pt dashed var(--border);
    padding-bottom: 8pt;
    margin-bottom: 10pt;
  }
  .biz-point {
    display: table;
    width: 100%;
    margin-bottom: 8pt;
  }
  .biz-icon {
    display: table-cell;
    width: 28pt;
    font-size: 14pt;
    vertical-align: top;
  }
  .biz-content { display: table-cell; vertical-align: top; padding-left: 4pt; }
  .biz-title { font-size: 10pt; font-weight: 700; color: var(--navy); margin-bottom: 2pt; }
  .biz-desc { font-size: 9pt; color: var(--text); line-height: 1.6; }

  /* ─────────────── 티어 비교 카드 ─────────────── */
  .tiers {
    display: table;
    width: 100%;
    border-spacing: 12pt 0;
    margin-top: 18pt;
  }
  .tier {
    display: table-cell;
    width: 50%;
    border: 1pt solid #E2E8F0;
    border-radius: 8pt;
    padding: 18pt 20pt;
    vertical-align: top;
  }
  .tier-pro {
    background: var(--cream);
    border: 2pt solid var(--orange);
    position: relative;
  }
  .tier-pro::before {
    content: "추천";
    position: absolute;
    top: -10pt;
    left: 50%;
    transform: translateX(-50%);
    background: var(--orange);
    color: white;
    font-size: 9pt;
    font-weight: 700;
    padding: 3pt 14pt;
    border-radius: 12pt;
  }
  .tier-name { font-size: 16pt; font-weight: 800; color: var(--navy); margin-bottom: 4pt; }
  .tier-price {
    font-size: 28pt;
    font-weight: 800;
    color: var(--navy);
    margin: 8pt 0 4pt;
    letter-spacing: -1pt;
  }
  .tier-price-suffix { font-size: 10pt; color: var(--muted); }
  .tier-note { font-size: 9pt; color: var(--muted); margin-bottom: 14pt; }
  .tier ul { list-style: none; padding: 0; }
  .tier li {
    font-size: 10pt;
    padding: 4pt 0;
    color: var(--text);
    line-height: 1.5;
  }
  .tier li.ok::before { content: "✓ "; color: var(--green); font-weight: 700; }
  .tier li.no::before { content: "✕ "; color: var(--faint); }
  .tier li.no { color: var(--faint); }

  /* ─────────────── 마지막 페이지 CTA ─────────────── */
  .cta-box {
    background: var(--navy);
    color: white;
    padding: 24pt 28pt;
    border-radius: 8pt;
    text-align: center;
    margin-bottom: 22pt;
  }
  .cta-title { font-size: 18pt; font-weight: 800; margin-bottom: 8pt; }
  .cta-sub { font-size: 11pt; color: #CBD5E1; margin-bottom: 14pt; }
  .cta-url {
    display: inline-block;
    background: var(--orange);
    color: white;
    font-size: 12pt;
    font-weight: 700;
    padding: 10pt 22pt;
    border-radius: 6pt;
    text-decoration: none;
  }
  .info-grid {
    display: table;
    width: 100%;
    margin-top: 18pt;
  }
  .info-grid .row {
    display: table-row;
  }
  .info-grid .cell {
    display: table-cell;
    border: 0.5pt solid #E2E8F0;
    padding: 12pt 14pt;
    vertical-align: top;
  }
  .info-grid .label {
    font-size: 8.5pt;
    color: var(--faint);
    letter-spacing: 0.5pt;
    font-weight: 600;
    margin-bottom: 4pt;
  }
  .info-grid .value {
    font-size: 11pt;
    color: var(--navy);
    font-weight: 700;
  }
  .info-grid .sub {
    font-size: 9pt;
    color: var(--muted);
    margin-top: 2pt;
  }

  .security-list { list-style: none; padding: 0; margin-top: 12pt; }
  .security-list li {
    font-size: 10pt;
    padding: 5pt 0;
    border-bottom: 0.5pt dashed #E2E8F0;
  }
  .security-list li::before { content: "🔒 "; }
  .security-list li:last-child { border-bottom: none; }
  .security-list strong { color: var(--navy); font-weight: 700; }

  .footer {
    margin-top: 32pt;
    text-align: center;
    font-size: 9pt;
    color: var(--muted);
    padding-top: 14pt;
    border-top: 0.5pt solid #E2E8F0;
  }
</style>
</head>
<body>

<!-- ──────────────────── PAGE 1 — 표지 ──────────────────── -->
<section class="page cover">
  <img class="icon" src="${iconB64}" alt="부픽" />
  <div class="label">PROPERTY ANALYSIS · SaaS</div>
  <h1 class="title">부픽</h1>
  <div class="accent-bar"></div>
  <p class="subtitle">공인중개사 사장님의 의뢰 분석 도구</p>

  <div class="hero">
    <div class="hero-num">매물 4만 건을 30초.</div>
    <div class="hero-text">의뢰 한 줄 → AI 분석 → 9페이지 PDF 제안서</div>
  </div>

  <div class="footer-line">
    <strong>Bottle Inc.</strong> · 판교 테크노밸리 · 2026
  </div>
</section>

<!-- ──────────────────── PAGE 2 — 부픽이 뭔가요 ──────────────────── -->
<section class="page">
  <header class="page-header">
    <div>
      <div class="label">WHAT</div>
      <h2>부픽이 뭔가요?</h2>
    </div>
    <span class="page-num">01 / 05</span>
  </header>

  <p class="lead">
    사장님이 받으신 <strong>매물 4만 건 엑셀</strong>과
    의뢰자가 카톡으로 보낸 <strong>의뢰 한 줄</strong>만 있으면,
    부픽이 <strong>30초 안에 의뢰 조건에 맞는 매물 5건</strong>을 찾아
    <strong>의뢰자에게 그대로 보낼 9페이지 PDF 제안서</strong>로 만들어 드립니다.
  </p>

  <h3 style="font-size: 12pt; font-weight: 700; color: var(--navy); margin-bottom: 10pt;">
    일반 워크플로우 vs 부픽
  </h3>

  <table class="compare">
    <thead>
      <tr>
        <th class="row-label">단계</th>
        <th>일반 (현재)</th>
        <th class="col-best">부픽</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="row-label">의뢰 조건 정리</td>
        <td class="legacy">엑셀에서 손으로 필터·정렬</td>
        <td class="boopick">카톡 메시지 그대로 붙여넣기 → AI 자동 파싱</td>
      </tr>
      <tr>
        <td class="row-label">매물 비교표</td>
        <td class="legacy">PPT·한컴으로 직접 작성</td>
        <td class="boopick">9페이지 PDF 자동 생성 (표지·비교표·매물별 상세)</td>
      </tr>
      <tr>
        <td class="row-label">매물별 강·약점</td>
        <td class="legacy">사장님 직감 + 일일이 작성</td>
        <td class="boopick">산업 관점 4가지 포인트 자동 분석 (Pro)</td>
      </tr>
      <tr>
        <td class="row-label">답사 1순위 결정</td>
        <td class="legacy">감으로</td>
        <td class="boopick">0~100점 6차원 적합도 점수 자동 산출</td>
      </tr>
      <tr>
        <td class="row-label">소요 시간</td>
        <td class="legacy">의뢰 1건당 1~2시간</td>
        <td class="boopick"><strong>30~60초</strong></td>
      </tr>
    </tbody>
  </table>

  <p class="lead" style="font-size: 11pt; color: var(--muted); margin-top: 18pt;">
    강남·판교 사옥 매물 다루시는 공인중개사 사장님,<br/>
    결혼정보회사·법무법인 등 특수 업종 의뢰 자주 받으시는 분 타겟.
  </p>
</section>

<!-- ──────────────────── PAGE 3 — 5단계 흐름 ──────────────────── -->
<section class="page">
  <header class="page-header">
    <div>
      <div class="label">HOW</div>
      <h2>5단계만 거치면 끝</h2>
    </div>
    <span class="page-num">02 / 05</span>
  </header>

  <p class="lead">
    엑셀 한 번 올리시면 데이터셋은 재사용 가능. 의뢰마다 Step 2부터 시작.
  </p>

  <div class="flow-grid">
    <div class="flow-row">
      <div class="flow-step">
        <div class="flow-num">STEP 1</div>
        <div class="flow-title">📊 엑셀 업로드</div>
        <div class="flow-desc">네이버부동산 매물 엑셀 그대로. 자동 컬럼 매핑.</div>
      </div>
      <div class="flow-step">
        <div class="flow-num">STEP 2</div>
        <div class="flow-title">💬 의뢰 입력</div>
        <div class="flow-desc">카톡으로 받은 의뢰 메시지 복붙. "결정사 150평 청담X 월관 3천" 식으로.</div>
      </div>
      <div class="flow-step">
        <div class="flow-num">STEP 3</div>
        <div class="flow-title">✏️ 조건 검토</div>
        <div class="flow-desc">AI가 풀어준 15개 필드 확인. 잘못 잡힌 건 수정.</div>
      </div>
      <div class="flow-step">
        <div class="flow-num">STEP 4</div>
        <div class="flow-title">🎯 매물 5건</div>
        <div class="flow-desc">적합도 0~100점 + 6차원 breakdown (면적·임대료·연식·주차·업종·기타)</div>
      </div>
      <div class="flow-step">
        <div class="flow-num">STEP 5</div>
        <div class="flow-title">📄 PDF</div>
        <div class="flow-desc">8~9페이지 제안서 다운로드. 의뢰자한테 그대로 카톡 전달.</div>
      </div>
    </div>
  </div>

  <h3 style="font-size: 12pt; font-weight: 700; color: var(--navy); margin: 22pt 0 10pt;">
    의뢰 메시지 입력 예시
  </h3>
  <div style="background: var(--bg-soft); padding: 14pt 18pt; border-left: 3pt solid var(--orange); border-radius: 0 4pt 4pt 0; font-size: 10pt; line-height: 1.7; color: var(--text);">
    "결혼정보회사 / 삼성역 선릉역 선정릉역 삼성동 (청담X) /<br/>
    사무실 140-200평 연층도 / 월관 최대 3천 / 직원 50명 /<br/>
    구축X 20년 이내 / 입주 6-7월"
  </div>
  <p style="font-size: 9pt; color: var(--muted); margin-top: 10pt; line-height: 1.6;">
    → AI가 자동 인식: <strong>업종</strong>=결혼정보회사 ·
    <strong>지역</strong>=4곳 (청담동 제외) ·
    <strong>면적</strong>=140~200평 (연층 허용) ·
    <strong>월관 합</strong>=3,000만 ·
    <strong>인원</strong>=50명 ·
    <strong>연식</strong>=20년 이내 ·
    <strong>입주</strong>=2026-06
  </p>
</section>

<!-- ──────────────────── PAGE 4 — 산업 분석 Pro 차별화 ──────────────────── -->
<section class="page">
  <header class="page-header">
    <div>
      <div class="label">PRO 차별화</div>
      <h2>산업 관점 분석</h2>
    </div>
    <span class="page-num">03 / 05</span>
  </header>

  <p class="lead">
    같은 면적·임대료라도 <strong>업종에 따라 매물 적합도가 완전히 달라집니다.</strong>
    결혼정보회사 의뢰면 회원 동선·프라이버시·주차가, 카페면 유동인구·1층·환기가 결정적입니다.<br/><br/>
    부픽 Pro는 의뢰 업종에 맞춰 <strong>매물별 4가지 강·약점을 AI가 자동 분석</strong>하고
    PDF에 그대로 들어갑니다.
  </p>

  <div class="biz">
    <div class="biz-header">💍 결혼정보회사 운영 관점 분석</div>
    <div class="biz-headline">신축 통사옥 = 결정사 이미지 메이킹 베스트</div>

    <div class="biz-point">
      <div class="biz-icon">🏛️</div>
      <div class="biz-content">
        <div class="biz-title">통사옥 = 결정사 단독 빌딩</div>
        <div class="biz-desc">지하1층~지상5층 단독 사용. 회원이 빌딩 진입 순간부터 "여기는 결정사 본관" 인식.</div>
      </div>
    </div>
    <div class="biz-point">
      <div class="biz-icon">✨</div>
      <div class="biz-content">
        <div class="biz-title">신축 첫 입주 = 인테리어 자유도 100%</div>
        <div class="biz-desc">25.07 사용승인. 결정사 컨셉으로 평면 처음부터 설계 가능. 상담실 18개·VIP 룸 분리.</div>
      </div>
    </div>
    <div class="biz-point">
      <div class="biz-icon">🎯</div>
      <div class="biz-content">
        <div class="biz-title">층별 동선 분리 = 회원 프라이버시</div>
        <div class="biz-desc">"회원끼리 마주치는 문제"를 5개 층 분산으로 해결. 매니저별 미팅 회원 다른 층에서 진행.</div>
      </div>
    </div>
    <div class="biz-point">
      <div class="biz-icon">⚠️</div>
      <div class="biz-content">
        <div class="biz-title">주차는 별도 보강 필요</div>
        <div class="biz-desc">자주식 5대로는 회원 동시 방문 7~10대 수용 어려움. 답사 시 발렛·공영주차 협의.</div>
      </div>
    </div>
  </div>

  <p style="font-size: 9.5pt; color: var(--muted); line-height: 1.7;">
    위 박스가 PDF 매물 페이지마다 자동으로 들어갑니다. 의뢰자(결정사 대표 등)는
    이 4가지 포인트를 보고 답사 우선순위를 즉시 판단할 수 있습니다.<br/>
    <strong>V2 추가 예정 업종</strong>: 음식점 · 술집 · 병원 · 학원 · 미용실 · 법무법인
  </p>
</section>

<!-- ──────────────────── PAGE 5 — 티어 + 가격 ──────────────────── -->
<section class="page">
  <header class="page-header">
    <div>
      <div class="label">PRICING</div>
      <h2>베이직 무료 · Pro 베타 무료</h2>
    </div>
    <span class="page-num">04 / 05</span>
  </header>

  <p class="lead">
    카드 등록 불필요. 베이직 가입 즉시 월 5건 리포트 무료.<br/>
    Pro는 베타 신청 → 한승수 대표 검토 후 24시간 내 승격.
    정식 출시 시 49,000원/월 예정.
  </p>

  <div class="tiers">
    <div class="tier">
      <div class="tier-name">베이직</div>
      <div class="tier-price">0<span class="tier-price-suffix"> 원/월</span></div>
      <div class="tier-note">카드 등록 불필요</div>
      <ul>
        <li class="ok">매물 데이터셋 업로드 무제한</li>
        <li class="ok">자연어 의뢰 AI 파싱</li>
        <li class="ok">매물 검색 + 적합도 점수</li>
        <li class="ok"><strong>월 5건</strong> PDF 리포트</li>
        <li class="ok">일반 사무실 가중치 분석</li>
        <li class="no">산업 관점 분석</li>
        <li class="no">QR 코드 + 네이버부동산 링크</li>
      </ul>
    </div>

    <div class="tier tier-pro">
      <div class="tier-name">Pro <span style="font-size: 11pt; color: var(--orange); font-weight: 600;">(베타)</span></div>
      <div class="tier-price">0<span class="tier-price-suffix"> 원/월 · 베타</span></div>
      <div class="tier-note">정식 출시 시 49,000원/월</div>
      <ul>
        <li class="ok">베이직 모든 기능</li>
        <li class="ok"><strong>월 50건</strong> PDF 리포트</li>
        <li class="ok"><strong>결혼정보회사 산업 관점 분석</strong></li>
        <li class="ok">매물별 4가지 강·약점 자동 분석</li>
        <li class="ok">QR 코드 (모바일 즉시 매물 확인)</li>
        <li class="ok">네이버부동산 클릭 링크</li>
        <li class="ok">V2 추가 산업 우선 액세스</li>
      </ul>
    </div>
  </div>

  <p style="font-size: 9pt; color: var(--muted); line-height: 1.6; margin-top: 22pt; text-align: center;">
    한 데이터셋으로 의뢰 여러 건 분석 가능 · 월 한도는 PDF 생성 횟수 기준 · 매월 1일 자동 리셋
  </p>
</section>

<!-- ──────────────────── PAGE 6 — 시작 + 보안 + 문의 ──────────────────── -->
<section class="page">
  <header class="page-header">
    <div>
      <div class="label">START</div>
      <h2>지금 바로 시작</h2>
    </div>
    <span class="page-num">05 / 05</span>
  </header>

  <div class="cta-box">
    <div class="cta-title">3분이면 첫 PDF가 손에 들어옵니다</div>
    <div class="cta-sub">카카오 로그인 · 무료 베이직 즉시 사용 가능</div>
    <span class="cta-url">https://boo-pick.vercel.app</span>
  </div>

  <h3 style="font-size: 12pt; font-weight: 700; color: var(--navy); margin-bottom: 6pt;">
    🔐 데이터 보안 · 광고법 준수
  </h3>
  <ul class="security-list">
    <li><strong>데이터셋 격리</strong> — 사장님 매물을 다른 사장님이 볼 수 없습니다 (Supabase RLS 정책)</li>
    <li><strong>PDF 임차인 PII 제외</strong> — 임대인 전화·이름 등 광고법 위반 정보 미포함</li>
    <li><strong>카카오 정보 최소화</strong> — 닉네임만 저장, 메시지·친구목록 일체 접근 안 함</li>
    <li><strong>매물 데이터 무단 가공 금지</strong> — 본인 업로드 데이터만 처리</li>
  </ul>

  <div class="info-grid">
    <div class="row">
      <div class="cell" style="width: 50%">
        <div class="label">회사</div>
        <div class="value">Bottle Inc. (주식회사 바틀)</div>
        <div class="sub">판교 테크노밸리 스타트업 캠퍼스</div>
      </div>
      <div class="cell" style="width: 50%">
        <div class="label">문의 · 베타 신청</div>
        <div class="value">dev@bottlecorp.kr</div>
        <div class="sub">한승수 대표 (24시간 내 회신)</div>
      </div>
    </div>
  </div>

  <div class="footer">
    부픽 V1 · 2026-05 · 베타 사용자 모집 중<br/>
    본 자료는 부픽 소개 목적이며, 매물 정보는 의뢰별 PDF 리포트에서 별도 안내됩니다.
  </div>
</section>

</body>
</html>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log("📝 HTML 빌드 중...");
  const html = await buildHTML();

  console.log("🖨  Puppeteer headless 시작...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
    });
    await writeFile(OUT_FILE, pdf);
    const sizeKB = (pdf.length / 1024).toFixed(0);
    console.log(`\n✅ 완료 → ${OUT_FILE} (${sizeKB} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("❌ 실패:", e);
  process.exit(1);
});
