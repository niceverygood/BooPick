# BooPick PDF 리포트 디자인 가이드

> Phase 4 (PDF 생성)에서 사용. `assets/proposal_v7_reference.pdf` 와 함께 참고.

---

## 🎨 디자인 토큰

### 색상 팔레트 (CSS 변수)

```css
:root {
  --color-primary: #0F172A;       /* Navy - 제목, 헤더, 강조 텍스트 */
  --color-accent: #B45309;        /* Orange - CTA, 강조 박스 테두리, 라벨 */
  --color-accent-light: #FFFBEB;  /* 연한 오렌지 - 100% 적합 매물 셀 배경 */
  --color-accent-border: #FDE68A; /* 오렌지 보더 */
  --color-success: #16A34A;       /* Green - 적합 체크 */
  --color-warning: #B45309;       /* Amber - 경고/보강 필요 */
  --color-info: #0EA5E9;          /* Sky Blue - 검토 의견 박스 */
  --color-info-bg: #F0F9FF;
  --color-text: #1F2937;
  --color-text-secondary: #475569;
  --color-text-muted: #64748B;
  --color-text-faint: #94A3B8;
  --color-bg: #FFFFFF;
  --color-bg-soft: #F8FAFC;
  --color-border: #E2E8F0;
}
```

### 타이포그래피

```css
body {
  font-family: 'Noto Sans CJK KR', 'Malgun Gothic', sans-serif;
  font-size: 10pt;
  line-height: 1.6;
}

h1 (표지) { font-size: 32pt; font-weight: 800; }
h2 (페이지 제목) { font-size: 16pt; font-weight: 700; }
h3 (섹션 제목) { font-size: 11pt; font-weight: 700; }
.label (작은 라벨) { font-size: 9pt; letter-spacing: 4pt; }
```

### A4 페이지 설정

```css
@page {
  size: A4;
  margin: 18mm 16mm;
}
```

### 배지 (Badge)

```css
.badge-100 { background: #B45309; color: white; }   /* 100% 적합 */
.badge-90  { background: #475569; color: white; }   /* 90% 적합 */
.badge-area { background: #DBEAFE; color: #1E40AF; }/* 위치/특성 */
.badge-new { background: #DCFCE7; color: #166534; } /* 신축 */
```

---

## 📄 PDF 페이지 구조 (9페이지)

### Pro 티어
1. **표지** - 제목, 의뢰 조건 메타박스, 날짜
2. **산업 운영 특성** (Pro만) - 5가지 평가 기준 카드
3. **검토 요약 + 비교표** - 5건 비교
4. **매물 1번 상세** - QR + 분석 박스
5. **매물 2번 상세**
6. **매물 3번 상세**
7. **매물 4번 상세**
8. **매물 5번 상세**
9. **다음 단계** - 답사 일정, 1순위 추천, 서명

### 베이직 티어 (8페이지)
- Page 2 (산업 운영 특성) 제거 → 8페이지
- 매물 페이지의 분석 박스 + QR 박스 모두 숨김
- 매물별 강점은 검토 요약 비교표에만 표시

---

## 🧩 컴포넌트 명세

### 1. 표지 (Cover Page)

```
[가운데 정렬, 위쪽 50mm 패딩]

PROPERTY PROPOSAL          ← .label (오렌지, letter-spacing 8pt)
                             margin-bottom: 16pt

  사무실 임대                ← h1 (32pt, navy, 800)
  매물 제안서                  line-height: 1.2
                             margin-bottom: 18pt

────                       ← .accent-bar (50pt × 3pt 오렌지)

결혼정보회사 운영 관점       ← .subtitle (14pt, gray)
베스트 5건                    margin-top: 8pt

[메타 박스 — 50pt 위쪽]
┌──────────────────────────┐
│  의 뢰  조 건             │ ← h3 (오렌지, letter-spacing 4pt)
│                          │
│  지역    삼성역 / 선릉역    │ ← .row (10pt)
│  면적    140 ~ 200평       │   strong: navy 60pt min-width
│  임대료   월관 최대 3,000만 │
│  ...                     │
└──────────────────────────┘

2026년 5월 9일             ← .date (11pt, gray, top 50pt)
```

### 2. 페이지 헤더 (모든 본문 페이지 공통)

```
검토 요약 및 추천 매물 비교            01 / 08
                                  ↑
─────────────────────────────────────  ← 2pt navy border-bottom
```

`h2` (16pt, navy, 700) | `.num` (9pt, gray, letter-spacing 1pt)

### 3. 검토 요약 박스 (page 3)

```
┌──────────────────────────────────────┐
│            40,795건 → 5건             │ ← 18pt, 800, orange
│  의뢰 조건에 부합하는 강남권 매물 검토 후  │
│  결혼정보회사 운영 적합도 점수순 압축      │
└──────────────────────────────────────┘
배경: #FEF3C7 (연한 옐로우)
보더: 1pt #FCD34D
```

### 4. 비교표 (page 3)

```
┌──────┬─────┬─────┬─────┬─────┬─────┐
│ 구분  │매물1 │매물2 │매물3 │매물4 │매물5 │ ← 헤더: navy bg, white text
│      │(베스트)│(주차)│(통사옥)│(선정릉)│(가성비)│
├──────┼─────┼─────┼─────┼─────┼─────┤
│매물번호│2619~│2620~│2620~│2624~│2622~│ ← Pro: 클릭 가능 링크
│위치   │선릉  │선릉  │선릉  │선정릉│선릉  │
│면적   │191평 │151평 │151평 │173평 │151평 │
│ ...   │ ... │ ... │ ... │ ... │ ... │
│주차   │5대   │8-9대 │11대 ⭐│4대  │4대   │
│준공   │25.07 │21.07 │21.07 │23.10 │23.11 │
└──────┴─────┴─────┴─────┴─────┴─────┘

100% 적합 매물 (1, 2, 3) 셀 배경: #FFFBEB (연한 오렌지)
헤더 100% 매물: 오렌지 #B45309 배경
폰트: 8pt
가격 cell: navy 700 (강조)
```

### 5. 매물 헤더 (각 매물 페이지)

```
01  선릉역 도보 4분 / 1~5층 통사옥 / 191평
    [100% 적합] [신축 1년차] [통사옥]
─────────────────────────────────────  ← 2pt navy border
```

`.listing-num-big` (28pt, 800, navy) | `h2` (12-13pt, 700) | 배지

### 6. NAVER PROPERTY ID 박스 (Pro 전용)

```
┌──────────────────────────────────┬─────┐
│  NAVER PROPERTY ID                │  ▦▦ │
│  2619530650                       │  ▦▦ │ ← QR (80pt × 80pt)
│  new.land.naver.com/?articleNo=.. │  ▦▦ │
│  링크 클릭 또는 QR 스캔하면          │ 모바일│
│  실내 사진·지도·등록 부동산 연락처    │ 스캔 │
└──────────────────────────────────┴─────┘
배경: #FFFBEB | 보더: 1pt #FDE68A
```

베이직: 이 박스 전체 제거 (display: none)

### 7. 정보 그리드 (Info Grid)

```
┌───────────┬───────────┬───────────┐
│ 면적       │ 위치       │ 준공일     │
│ 191평      │ 1~5층      │ 2025.07   │
│ 전용 191평 │ 통사옥     │ 신축 1년차 │
├───────────┼───────────┼───────────┤
│ 보증금     │ 월세       │ 지정 주차  │
│ 3억        │ 2,800만+α │ 자주식 5대 │
│ 협의 가능   │ 관리비 별도│ 보강 필요  │
└───────────┴───────────┴───────────┘
3-column grid, td padding 9pt 11pt
.info-label: 7.5pt #94A3B8 letter-spacing 0.3pt
.info-value: 11pt 700 #0F172A
.info-sub: 8pt #64748B
```

### 8. 산업 관점 분석 박스 (Pro 전용 핵심) ⭐

```
┌──────────────────────────────────────┐
│ 💍 결혼정보회사 운영 관점 분석          │ ← .biz-analysis-header (10.5pt, 700, orange)
│ 결정사 신규 사옥의 "이미지 메이킹" 베스트 │ ← .biz-analysis-headline (11pt, 700, dashed underline)
│                                      │
│  🏛️ 통사옥 = 결정사 단독 빌딩          │ ← .biz-title (9.5pt, 700)
│      지하1층부터 지상5층까지 결정사     │ ← .biz-desc (9pt, line-height 1.65)
│      단독 사용. 회원이 빌딩 진입...    │
│                                      │
│  ✨ 신축 첫 입주 = 인테리어 자유도 100%│
│      ...                             │
│                                      │
│  🎯 층별 동선 분리 = 회원 프라이버시   │
│      ...                             │
│                                      │
│  ⚠️ 주차는 별도 보강 필요              │
│      자주식 5대로는 회원 동시 방문...  │
└──────────────────────────────────────┘
배경: linear-gradient(to right, #FFFBEB 0%, #FEF9F0 100%)
보더: 1.5pt #FDE68A | radius: 6pt | padding: 13pt 16pt
```

```css
.biz-analysis {
  background: linear-gradient(to right, #FFFBEB 0%, #FEF9F0 100%);
  border: 1.5pt solid #FDE68A;
  border-radius: 6pt;
  padding: 13pt 16pt;
  margin-bottom: 12pt;
}
.biz-point {
  display: table;
  width: 100%;
  margin-bottom: 8pt;
}
.biz-icon {
  display: table-cell;
  width: 26pt;
  vertical-align: top;
  font-size: 14pt;
}
.biz-content {
  display: table-cell;
  vertical-align: top;
  padding-left: 4pt;
}
.biz-title {
  font-size: 9.5pt;
  color: #0F172A;
  font-weight: 700;
  margin-bottom: 2pt;
}
.biz-desc {
  font-size: 9pt;
  color: #1F2937;
  line-height: 1.65;
}
```

베이직: 이 박스 전체 제거.

### 9. 적합도 체크리스트

```
┌──────────────────────────────────────┐
│ 의뢰 조건 적합도 체크                  │
│ ─────────────────────────────────── │
│ 지역                       ✓ 선릉역 ↗│
│ 면적 140~200평           ★ 191평 ↗│
│ 준공 20년 이내    ★ 2025년 신축 ↗│
│ 임대료 월 2~3천만   ✓ 2,800만+α ↗│
│ 인테리어 자유      ★ 신축 첫 입주 ↗│
│ 방문주차    △ 자주식 5대 — 보강 필요│
└──────────────────────────────────────┘
배경: #F8FAFC | padding: 9pt 14pt
✓ green / ★ green-bold / △ orange (warn)
```

---

## 📦 Placeholder 명세 (HTML 템플릿)

PDF 생성기가 치환하는 placeholder 목록:

### 공통
- `{{TITLE}}` - "사무실 임대 매물 제안서"
- `{{SUBTITLE}}` - "결혼정보회사 운영 관점 베스트 5건"
- `{{DATE}}` - "2026년 5월 9일"
- `{{INDUSTRY}}` - "결혼정보회사" (Pro만)
- `{{TIER}}` - "basic" or "pro"

### 의뢰 조건 메타
- `{{COND_REGION}}` - 지역 한 줄
- `{{COND_AREA}}` - "140 ~ 200평 (연층 검토 가능)"
- `{{COND_RENT}}` - "월세 + 관리비 최대 3,000만"
- `{{COND_EMPLOYEES}}` - "50명 + 상담실 18개..."
- ...

### 매물 1~5 (각각)
- `{{LISTING_N_ARTICLE_NO}}` - "2619530650"
- `{{LISTING_N_TITLE}}` - "선릉역 도보 4분 / 1~5층 통사옥 / 191평"
- `{{LISTING_N_BADGES}}` - HTML (`<span class="badge ...">...`)
- `{{LISTING_N_AREA}}` - "191평"
- `{{LISTING_N_AREA_SUB}}` - "전용 191평 (전용률 100%)"
- `{{LISTING_N_FLOOR}}` - "1~5층"
- `{{LISTING_N_FLOOR_SUB}}` - "통사옥 (지하1층+지상5층)"
- `{{LISTING_N_YEAR}}` - "2025.07"
- `{{LISTING_N_YEAR_SUB}}` - "신축 1년차"
- `{{LISTING_N_DEPOSIT}}` - "3억"
- `{{LISTING_N_RENT}}` - "2,800만 +α"
- `{{LISTING_N_RENT_SUB}}` - "관리비 별도 (협의)"
- `{{LISTING_N_PARKING}}` - "법정 자주식 5대"
- `{{LISTING_N_PARKING_SUB}}` - "방문 주차 협의 필요"
- `{{LISTING_N_FEATURES}}` - HTML (`<span class="feature-tag">...`)
- `{{LISTING_N_CHECKS}}` - HTML (`<tr>...</tr>` 6개)
- `{{LISTING_N_AGENCY}}` - "(주)미스터부동산중개법인"

### Pro 전용
- `{{LISTING_N_QR_BASE64}}` - QR 코드 base64 (data: URL용 prefix 없이)
- `{{LISTING_N_URL}}` - "https://new.land.naver.com/?articleNo=..."
- `{{LISTING_N_QR_VISIBLE}}` - "block" or "none"
- `{{LISTING_N_BIZ_ANALYSIS}}` - 산업 분석 박스 HTML 전체
- `{{INDUSTRY_CONTEXT_PAGE}}` - 운영 특성 페이지 HTML 전체

### 비교표
- `{{COMPARE_TABLE_HTML}}` - 비교표 전체 HTML (조건별 다른 행 수)

### 마지막 페이지
- `{{NEXT_STEPS_RECOMMENDATION}}` - 1순위 추천 매물 안내 텍스트

---

## ✅ PDF 품질 검증 기준

생성된 PDF는 다음 기준 통과해야 함:

- [ ] 한국어 폰트 깨짐 없음 (Noto Sans KR 임베드)
- [ ] 9페이지 (Pro) / 8페이지 (베이직)
- [ ] 파일 크기 5MB 이하 (카톡 첨부 가능)
- [ ] QR 코드 모바일 카메라로 정상 스캔 (Pro)
- [ ] 매물번호 클릭 시 네이버부동산 페이지 이동 (Pro)
- [ ] 비교표 모든 컬럼 잘림 없이 출력
- [ ] 페이지 break 자연스러움 (매물 정보 잘리지 않음)
- [ ] 산업 분석 박스 4개 포인트 모두 출력 (Pro)
- [ ] 베이직: QR/분석 박스 자리에 빈 공간 없이 자연스럽게 닫힘
