# Phase 3: 매물 검색 + 점수화

> **목표**: 파싱된 조건으로 SQL 검색 → 적합도 점수 → 상위 5건 추출
> **소요 시간**: 1~2일
> **선행 조건**: Phase 1, 2 완료

---

## 📌 클로드 코드에게 줄 프롬프트

```
@CLAUDE.md 정독하고 시작해줘.

# Phase 3: 매물 검색 + 점수화

## 핵심 시나리오

Phase 2에서 파싱된 ParsedQuery 객체를 받아:
1. SQL 쿼리로 1차 필터링 (지역, 면적, 임대료, 준공 등)
2. 각 매물에 적합도 점수 계산 (0-100)
3. 점수 내림차순 정렬 후 상위 5건 추출
4. 결과를 사용자에게 표시 + 리포트 생성 버튼

## 작업 1: 검색 + 스코어링 (lib/scoring.ts)

```typescript
import { ParsedQuery } from './query-parser';

export interface Listing {
  id: number;
  article_no: string;
  지역: string;
  공급_m2: number;
  전용_m2: number;
  공급_평: number;
  전용_평: number;
  해당층: string;
  전체층: string;
  보증금: number;
  월세: number;
  관리비: number | null;
  사용승인일: string;
  간략설명: string;
  설명: string;
  중개사무소명: string;
}

export interface ScoredListing extends Listing {
  점수: number;
  점수_근거: {
    면적: number;
    임대료: number;
    연식: number;
    주차: number;
    업종: number;
    기타: number;
  };
}

export function scoreListing(listing: Listing, query: ParsedQuery): ScoredListing {
  let scores = {
    면적: 0,
    임대료: 0,
    연식: 0,
    주차: 0,
    업종: 0,
    기타: 0,
  };

  // 1. 면적 점수 (max 30)
  if (query.area_min_평 && query.area_max_평) {
    const 평 = listing.공급_평;
    const min = query.area_min_평;
    const max = query.area_max_평;
    const center = (min + max) / 2;

    if (평 >= min && 평 <= max) {
      // 의뢰 면적 정확 부합
      const dist = Math.abs(평 - center) / (max - min);
      scores.면적 = Math.round(30 * (1 - dist * 0.5));  // 25-30점
    } else if (query.area_연층_허용 && 평 >= min * 0.5 && 평 <= max * 1.3) {
      // 연층 허용 시 + 면적 살짝 큰/작은 경우
      scores.면적 = 15;
    } else if (평 >= min * 0.7 && 평 <= max * 1.2) {
      scores.면적 = 10;
    }
  } else {
    scores.면적 = 15;  // 면적 조건 없으면 중립
  }

  // 2. 임대료 점수 (max 20)
  if (query.rent_max_total_만원) {
    const 월세_만 = listing.월세 / 10000;
    const 관리비_만 = (listing.관리비 ?? 0) / 10000;
    const 합 = 월세_만 + 관리비_만;
    const max_총 = query.rent_max_total_만원;

    if (합 <= max_총 * 0.7) scores.임대료 = 20;     // 30% 절약
    else if (합 <= max_총) scores.임대료 = 15;       // 예산 내
    else if (합 <= max_총 * 1.1) scores.임대료 = 8;  // 살짝 초과
  } else {
    scores.임대료 = 10;
  }

  // 3. 연식 점수 (max 20)
  if (listing.사용승인일) {
    const year = new Date(listing.사용승인일).getFullYear();
    const 나이 = 2026 - year;
    const limit = query.max_age_year ?? 20;

    if (나이 <= 5) scores.연식 = 20;        // 신축
    else if (나이 <= 10) scores.연식 = 15;
    else if (나이 <= limit) scores.연식 = 10;
    else if (나이 <= limit + 2) scores.연식 = 5; // 살짝 초과 (경계)
    else scores.연식 = 0;
  }

  // 4. 주차 점수 (max 15)
  // 광고 본문에서 추출 (자주식 N대, 기계식 N대)
  const text = `${listing.간략설명 ?? ''} ${listing.설명 ?? ''}`.toLowerCase();
  const 자주식_match = text.match(/자주식\s*(\d+)/);
  const 자주식_대수 = 자주식_match ? parseInt(자주식_match[1]) : 0;

  if (자주식_대수 >= 8) scores.주차 = 15;
  else if (자주식_대수 >= 5) scores.주차 = 10;
  else if (자주식_대수 >= 3) scores.주차 = 5;
  else if (text.includes('자주식') || text.includes('주차')) scores.주차 = 3;

  // 5. 업종 적합도 점수 (max 10)
  if (query.industry) {
    const industryKeywords = {
      '결혼정보회사': ['상담', '룸', '폰부스', '병원', '의원', '학원', '사무실'],
      '음식점': ['식당', '음식점', '카페', '레스토랑'],
      '술집': ['주점', '바', '펍', '술집', '맥주'],
      '병원': ['병원', '의원', '진료실', '메디컬'],
      '학원': ['학원', '교습소', '강의실'],
    };
    const keywords = (industryKeywords as any)[query.industry] || [];
    const matches = keywords.filter((k: string) => text.includes(k)).length;
    scores.업종 = Math.min(10, matches * 3);
  } else {
    scores.업종 = 5;
  }

  // 6. 기타 가산점 (max 5)
  // 통사옥, 신축, 무권리 등
  if (text.includes('통사옥') || text.includes('통임대') || text.includes('단독사옥')) scores.기타 += 3;
  if (text.includes('무권리') || text.includes('렌트프리')) scores.기타 += 2;
  scores.기타 = Math.min(5, scores.기타);

  const 총점 = Object.values(scores).reduce((a, b) => a + b, 0);

  return {
    ...listing,
    공급_평: listing.공급_m2 / 3.3058,
    전용_평: listing.전용_m2 / 3.3058,
    점수: 총점,
    점수_근거: scores,
  };
}

export function buildSearchSQL(query: ParsedQuery, datasetId: string) {
  // SELECT 절 + WHERE 절 동적 빌드
  const conditions: string[] = [`dataset_id = '${datasetId}'`];

  // 지역 필터
  if (query.regions && query.regions.length > 0) {
    const regionConds = query.regions.map(r =>
      `(간략설명 ILIKE '%${r}%' OR 설명 ILIKE '%${r}%' OR 주소 ILIKE '%${r}%')`
    );
    conditions.push(`(${regionConds.join(' OR ')})`);
  }

  // 제외 지역
  if (query.exclude_regions && query.exclude_regions.length > 0) {
    for (const ex of query.exclude_regions) {
      conditions.push(`NOT (간략설명 ILIKE '%${ex}%' OR 설명 ILIKE '%${ex}%' OR 주소 ILIKE '%${ex}%')`);
    }
  }

  // 면적 (㎡로 변환해서 비교)
  if (query.area_min_평) {
    const min_m2 = query.area_min_평 * 3.3058;
    // 연층 허용 시 더 넓은 범위
    const factor = query.area_연층_허용 ? 0.5 : 0.7;
    conditions.push(`공급_m2 >= ${min_m2 * factor}`);
  }
  if (query.area_max_평) {
    const max_m2 = query.area_max_평 * 3.3058;
    const factor = query.area_연층_허용 ? 1.3 : 1.2;
    conditions.push(`공급_m2 <= ${max_m2 * factor}`);
  }

  // 임대료
  if (query.rent_max_total_만원) {
    // 월세만 우선 필터링 (관리비는 nullable)
    const max_월세 = query.rent_max_total_만원 * 10000;
    conditions.push(`월세 <= ${max_월세}`);
  }

  // 준공 연도
  if (query.max_age_year) {
    const min_year = 2026 - query.max_age_year - 2;  // 경계 여유
    conditions.push(`EXTRACT(YEAR FROM 사용승인일) >= ${min_year}`);
  }

  return conditions.join(' AND ');
}
```

## 작업 2: 검색 API (app/api/search/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scoreListing, buildSearchSQL, ScoredListing } from '@/lib/scoring';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dataset_id, query } = await req.json();

  // 데이터셋 소유권 검증
  const { data: ds } = await supabase.from('datasets')
    .select('id').eq('id', dataset_id).eq('user_id', user.id).single();
  if (!ds) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });

  // 1차 SQL 필터링
  const where = buildSearchSQL(query, dataset_id);
  const { data: candidates, error } = await supabase
    .rpc('search_listings_dynamic', { where_clause: where, limit_n: 200 });
  // ↑ Supabase에서 동적 WHERE 절은 RPC로 안전하게 처리

  // OR: 직접 쿼리 빌더로
  let supaQuery = supabase.from('listings')
    .select('*')
    .eq('dataset_id', dataset_id)
    .limit(500);

  if (query.area_min_평) {
    supaQuery = supaQuery.gte('공급_m2', query.area_min_평 * 3.3058 * (query.area_연층_허용 ? 0.5 : 0.7));
  }
  if (query.area_max_평) {
    supaQuery = supaQuery.lte('공급_m2', query.area_max_평 * 3.3058 * (query.area_연층_허용 ? 1.3 : 1.2));
  }
  if (query.rent_max_total_만원) {
    supaQuery = supaQuery.lte('월세', query.rent_max_total_만원 * 10000);
  }
  if (query.max_age_year) {
    supaQuery = supaQuery.gte('사용승인일', `${2026 - query.max_age_year - 2}-01-01`);
  }

  const { data: rows } = await supaQuery;

  // 지역 필터링 (텍스트 검색은 클라이언트에서)
  const filtered = (rows ?? []).filter((l: any) => {
    const text = `${l.간략설명 ?? ''} ${l.설명 ?? ''} ${l.주소 ?? ''}`;
    if (query.regions && !query.regions.some((r: string) => text.includes(r))) return false;
    if (query.exclude_regions?.some((ex: string) => text.includes(ex))) return false;
    return true;
  });

  // 스코어링
  const scored = filtered.map((l: any) => scoreListing(l, query))
    .sort((a, b) => b.점수 - a.점수)
    .slice(0, 5);

  return NextResponse.json({
    total_filtered: filtered.length,
    results: scored,
  });
}
```

## 작업 3: 검색 결과 페이지 UI (results-table.tsx)

```
┌─────────────────────────────────────────┐
│  검색 결과: 5건                           │
│  (40,795건 중 조건 부합 187건 → 상위 5건) │
├─────────────────────────────────────────┤
│                                         │
│  📊 비교표                               │
│  ┌──┬─────┬─────┬─────┬─────┬─────┐    │
│  │#1│191평 │ 2층 │2,800│자주5│25.07│    │
│  │#2│151평 │ 2층 │2,500│자주9│21.07│    │
│  │#3│151평 │통사옥│2,500│자주11│21.07│   │
│  │#4│173평 │ 2층 │2,500│자주4│23.10│    │
│  │#5│151평 │ 5층 │2,000│자주4│23.11│    │
│  └──┴─────┴─────┴─────┴─────┴─────┘    │
│                                         │
│  🎯 매물별 적합도 점수                     │
│  매물 1: 95점 / 매물 2: 92점 ...          │
│                                         │
├─────────────────────────────────────────┤
│  [📄 PDF 리포트 생성하기 →]               │
└─────────────────────────────────────────┘
```

각 매물 카드 (모바일 세로 정렬):
```
┌──────────────────────────┐
│ 01  191평 / 2층 / 2,800만 │
│ ⭐ 95점 (적합도)            │
│ 선릉역 도보 4분 / 25.07 신축 │
│ 자주식 5대                 │
│ [네이버부동산 보기 ↗]       │
└──────────────────────────┘
```

## 작업 4: 결과 미리보기 + 점수 근거

각 매물 클릭 시 상세 점수 근거 펼치기 (accordion):
```
매물 1 - 95점
├─ 면적 (30/30) ✅ 191평 (의뢰 정확)
├─ 임대료 (15/20) ✅ 합 2,800 (예산의 93%)
├─ 연식 (20/20) ⭐ 25.07 신축 1년차
├─ 주차 (10/15) △ 자주식 5대
├─ 업종 (10/10) ✅ "통사옥, 사무실" 키워드
└─ 기타 (5/5) ⭐ 통사옥 + 신축
```

## 작업 5: 검색 흐름 통합 (search/page.tsx)

```
1단계: 데이터셋 선택
2단계: 자유 텍스트 입력 → AI 파싱
3단계: 파싱 결과 검토 + 수정
4단계: 검색 실행 (이 Phase)
5단계: 결과 5건 표시 + PDF 생성 버튼 (Phase 4)
```

각 단계는 React state로 진행 (multistep form).

## 작업 6: 검색 후 reports 테이블에 임시 저장

검색 완료 시 (PDF 생성 전):
```typescript
const { data: report } = await supabase.from('reports').insert({
  user_id: user.id,
  dataset_id,
  query_raw: rawQuery,
  query_parsed: parsedQuery,
  industry: parsedQuery.industry,
  selected_listings: scored.map(s => s.id),
  tier_used: profile.tier,  // 'basic' or 'pro'
}).select().single();
```

PDF는 Phase 4에서 생성 후 pdf_url 업데이트.

## 검증 체크리스트

- [ ] 결정사 의뢰 조건 입력 시 정확한 5건 도출
  - 매물번호 2619530650, 2620921581, 2620066026, 2624105069, 2622751529
  - 또는 비슷한 점수의 매물 5건
- [ ] 점수 합계 90점 이상이 1순위 매물
- [ ] 면적 조건 부합 매물만 추출 (140-200평 ± 연층 30%)
- [ ] 청담동 매물 자동 제외
- [ ] 검색 시간 5초 이내
- [ ] 점수 근거가 사용자에게 명확히 보임
- [ ] 매물 카드 클릭 시 네이버부동산 새 탭으로 열림 (Pro 티어 한정)

위 통과하면 Phase 4 진행 가능.

진행해줘.
```

---

## ✅ 완료 후 다음 단계

→ `Phase 4: PDF 리포트 생성 (베이직)`
