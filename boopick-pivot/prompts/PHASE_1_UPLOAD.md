# Phase 1: 매물 업로드 + 자동 컬럼 매핑

> **목표**: 사용자가 Excel/CSV 파일 업로드 → 자동으로 컬럼 매핑 → 매물 DB 저장
> **소요 시간**: 1~2일
> **선행 조건**: Phase 0 완료

---

## 📌 클로드 코드에게 줄 프롬프트

```
@CLAUDE.md @assets/excel_column_mapping.json 두 파일을 먼저 정독해줘.

# Phase 1: 매물 엑셀 업로드 기능

## 핵심 시나리오

사용자(부동산 사장님)가 평소에 사용하는 매물 엑셀(.xlsx)을 부픽에 업로드하면:
1. 첫 행 헤더 자동 인식
2. 우리 표준 컬럼(article_no, 공급_m2, 월세 등)에 매핑
3. 사용자에게 매핑 결과 보여주고 수정 가능
4. 확인 누르면 listings 테이블에 일괄 저장

## 작업 1: 엑셀 파서 (lib/excel-parser.ts)

```typescript
import * as XLSX from 'xlsx';

export interface RawExcelRow {
  [key: string]: string | number | null;
}

export interface ParsedListing {
  article_no?: string;
  지역?: string;
  공급_m2?: number;
  전용_m2?: number;
  해당층?: string;
  전체층?: string;
  보증금?: number;
  월세?: number;
  관리비?: number;
  현재업종?: string;
  추천업종?: string;
  간략설명?: string;
  설명?: string;
  주소?: string;
  사용승인일?: string;
  중개사무소명?: string;
  raw_data: RawExcelRow;  // 원본 보관
}

export async function parseExcelFile(file: File): Promise<{
  headers: string[];
  rows: RawExcelRow[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, {
    type: 'array',
    cellFormula: true,  // HYPERLINK 함수 인식 위함
  });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<RawExcelRow>(ws, {
    header: 1,
    defval: null,
  });

  // 첫 행이 헤더
  const headers = (data[0] as unknown as string[]) || [];

  // 매물번호 컬럼이 HYPERLINK 함수로 들어있는 경우 처리
  const rows: RawExcelRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row: RawExcelRow = {};
    headers.forEach((header, idx) => {
      const cellRef = XLSX.utils.encode_cell({ r: i, c: idx });
      const cell = ws[cellRef];

      if (cell?.f && /HYPERLINK\("([^"]+)"/.test(cell.f)) {
        // HYPERLINK 함수에서 articleNo 추출
        const url = cell.f.match(/HYPERLINK\("([^"]+)"/)![1];
        const articleMatch = url.match(/articleNo=(\d+)/);
        row[header] = articleMatch ? articleMatch[1] : cell.v;
      } else {
        row[header] = (data[i] as any[])[idx] ?? null;
      }
    });
    rows.push(row);
  }

  return { headers, rows };
}

// 표준 컬럼 자동 매핑
export function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  // 네이버부동산 표준 헤더 매핑 룰
  const rules: Array<[string[], string]> = [
    [['매물번호', '매물 번호', 'article_no'], 'article_no'],
    [['공급/계약/대지', '공급', '계약면적', '공급면적'], '공급_m2'],
    [['전용/연', '전용', '전용면적'], '전용_m2'],
    [['해당층'], '해당층'],
    [['전체층', '총층'], '전체층'],
    [['전세금', '보증금'], '보증금'],
    [['월세'], '월세'],
    [['관리비'], '관리비'],
    [['현재업종'], '현재업종'],
    [['추천업종'], '추천업종'],
    [['간략설명', '제목'], '간략설명'],
    [['설명', '상세설명', '본문'], '설명'],
    [['주소', '소재지'], '주소'],
    [['사용승인일', '준공일'], '사용승인일'],
    [['중개사무소명', '부동산', '중개사'], '중개사무소명'],
  ];

  for (const header of headers) {
    if (!header) continue;
    const trimmed = String(header).trim();
    for (const [aliases, target] of rules) {
      if (aliases.some(a => trimmed.includes(a))) {
        mapping[trimmed] = target;
        break;
      }
    }
  }

  return mapping;
}

// 행을 ParsedListing 으로 변환
export function rowToListing(
  row: RawExcelRow,
  mapping: Record<string, string>
): ParsedListing {
  const result: ParsedListing = { raw_data: row };

  for (const [src, target] of Object.entries(mapping)) {
    const value = row[src];
    if (value === null || value === undefined || value === '') continue;

    // 숫자 필드
    if (['공급_m2', '전용_m2', '보증금', '월세', '관리비'].includes(target)) {
      const num = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
      if (!isNaN(num)) (result as any)[target] = num;
    }
    // 날짜 필드
    else if (target === '사용승인일') {
      const dateStr = String(value).split('T')[0].split(' ')[0];
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        (result as any)[target] = dateStr;
      }
    }
    // 문자열 필드
    else {
      (result as any)[target] = String(value).trim();
    }
  }

  // 지역 자동 추출 (간략설명 + 설명 + 주소에서)
  if (!result.지역) {
    const text = `${result.간략설명 ?? ''} ${result.설명 ?? ''} ${result.주소 ?? ''}`;
    const regions = ['삼성동', '삼성역', '선릉역', '선정릉역', '역삼역', '강남역', '청담동', '논현동'];
    for (const r of regions) {
      if (text.includes(r)) {
        result.지역 = r;
        break;
      }
    }
  }

  return result;
}
```

## 작업 2: 업로드 API (app/api/upload/route.ts)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseExcelFile, autoMapColumns, rowToListing } from '@/lib/excel-parser';

export const runtime = 'nodejs';
export const maxDuration = 60;  // 60초 (큰 파일)

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  // 파일 파싱
  const { headers, rows } = await parseExcelFile(file);
  const mapping = autoMapColumns(headers);
  const listings = rows.map(r => rowToListing(r, mapping));

  // datasets 생성
  const { data: dataset, error: dsError } = await supabase
    .from('datasets')
    .insert({
      user_id: user.id,
      name: file.name.replace(/\.(xlsx?|csv)$/i, ''),
      original_filename: file.name,
      row_count: listings.length,
    })
    .select()
    .single();
  if (dsError) return NextResponse.json({ error: dsError.message }, { status: 500 });

  // listings 일괄 삽입 (1000개씩 배치)
  const BATCH = 1000;
  for (let i = 0; i < listings.length; i += BATCH) {
    const batch = listings.slice(i, i + BATCH).map(l => ({
      dataset_id: dataset.id,
      ...l,
    }));
    const { error } = await supabase.from('listings').insert(batch);
    if (error) {
      // 롤백
      await supabase.from('datasets').delete().eq('id', dataset.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    dataset_id: dataset.id,
    row_count: listings.length,
    headers,
    mapping,
    sample: listings.slice(0, 3),
  });
}
```

## 작업 3: 업로드 페이지 (app/(dashboard)/dashboard/upload/page.tsx)

shadcn/ui 사용:
- Card 안에 큰 드롭존 영역
- 드래그&드롭 + 파일 선택 버튼
- 업로드 중 progress bar
- 성공 시 "X건 업로드 완료" + 컬럼 매핑 결과 테이블
- 잘못 매핑된 컬럼 사용자가 수정 가능 (드롭다운)
- "다음 단계: 검색하기" 버튼 → /dashboard/search?dataset_id=xxx

레이아웃 (모바일 우선):
```
┌─────────────────────────────────┐
│  매물 데이터 업로드               │
├─────────────────────────────────┤
│                                 │
│   📊 클릭 또는 드래그&드롭        │
│   .xlsx, .csv 파일               │
│                                 │
├─────────────────────────────────┤
│  업로드 후:                       │
│  • 자동 컬럼 매핑 확인            │
│  • 잘못된 매핑 수정 가능          │
└─────────────────────────────────┘
```

UploadDropzone 컴포넌트 (components/upload-dropzone.tsx)에서 react-dropzone 또는 native drag/drop 사용.

## 작업 4: 컬럼 매핑 컴포넌트 (components/column-mapping.tsx)

업로드 완료 후 표시:
```
┌────────────────┬────────────────┐
│ 엑셀 헤더       │ 부픽 표준 컬럼   │
├────────────────┼────────────────┤
│ 공급/계약/대지   │ 공급_m2 ▼      │
│ 전용/연         │ 전용_m2 ▼      │
│ 월세            │ 월세 ▼         │
│ 매물번호        │ article_no ▼   │
│ ...            │ ...            │
└────────────────┴────────────────┘
[저장하고 검색하기]
```

## 작업 5: 데이터셋 리스트 (대시보드 통합)

app/(dashboard)/dashboard/page.tsx 업데이트:
```
"내 데이터셋"
- 260504_40795건.xlsx (40,795건, 어제 업로드)  [검색하기]
- 250320_강남매물.xlsx (12,000건, 1주일 전)    [검색하기]

[+ 새 매물 업로드]
```

각 데이터셋 옆에 "삭제" 버튼 (휴지통 아이콘).

## 작업 6: 매물 카운트 검증

업로드 후 dashboard로 돌아가면 정확한 건수 표시:
```sql
SELECT count(*) FROM listings WHERE dataset_id = 'xxx';
```

## 검증 체크리스트

- [ ] 한대표가 갖고 있는 260504_40795건__7_.xlsx 파일 업로드 가능
- [ ] 컬럼 자동 매핑 정확도 80% 이상 (15개 표준 컬럼 중 12개 이상)
- [ ] HYPERLINK 함수의 article_no 정확 추출
- [ ] 40,795건 1분 이내 처리
- [ ] 다른 사용자 매물은 보이지 않음 (RLS 작동)
- [ ] 컬럼 매핑 사용자 수정 후 저장 가능
- [ ] 데이터셋 삭제 시 listings cascade 삭제

위 통과하면 Phase 2 진행 가능.

진행해줘.
```

---

## 📦 자료 파일

`/assets/excel_column_mapping.json` 참고 (네이버부동산 엑셀 표준 헤더)

---

## ✅ 완료 후 다음 단계

→ `Phase 2: 의뢰 조건 입력 + AI 파싱`
