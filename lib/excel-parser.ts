// 부픽 V3 매물 엑셀 파서
//
// 주요 기능:
//  - HYPERLINK 함수 셀에서 articleNo 추출
//  - 헤더 자동 매핑 (column-mappings.ts)
//  - 평/㎡ 단위 자동 인식
//  - 본문에서 지역/관리비 정규식 추출

import * as XLSX from "xlsx";
import {
  COLUMN_MAPPINGS,
  EXTRACTION_RULES,
  autoMapHeaders,
  type StandardColumn,
} from "./column-mappings";

export interface ParsedListing {
  article_no: string | null;
  지역: string | null;
  공급_m2: number | null;
  전용_m2: number | null;
  해당층: string | null;
  전체층: string | null;
  보증금: number | null;
  월세: number | null;
  관리비: number | null;
  현재업종: string | null;
  추천업종: string | null;
  간략설명: string | null;
  설명: string | null;
  주소: string | null;
  사용승인일: string | null;
  중개사무소명: string | null;
  raw_data: Record<string, unknown>;
}

export interface ParseResult {
  headers: string[];
  rows: Array<Record<string, unknown>>;
  totalRows: number;
}

export interface ConvertOptions {
  // 사용자 매핑 우선 적용 (없으면 자동 매핑)
  userMapping?: Record<string, StandardColumn | null>;
}

/** 엑셀 파일 → 헤더 + 데이터 행 */
export function parseExcel(workbook: XLSX.WorkBook): ParseResult {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [], totalRows: 0 };
  const sheet = workbook.Sheets[sheetName];

  // header 추출 (1행 raw)
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });
  const headerRow = (aoa[0] ?? []) as unknown[];
  const headers = headerRow.map((h) =>
    h == null ? "" : String(h).trim()
  );

  // 데이터 행 (heading-aware) — HYPERLINK 처리를 위해 셀 직접 접근
  const rows: Array<Record<string, unknown>> = [];
  const range = sheet["!ref"]
    ? XLSX.utils.decode_range(sheet["!ref"])
    : null;
  if (!range) return { headers, rows, totalRows: 0 };

  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    const row: Record<string, unknown> = {};
    for (let C = range.s.c; C <= range.e.c; C++) {
      const header = headers[C - range.s.c];
      if (!header) continue;
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = sheet[addr];
      if (!cell) {
        row[header] = null;
        continue;
      }

      // HYPERLINK 처리
      // - cell.v는 표시값 ("2619530650")
      // - cell.f는 수식 (=HYPERLINK("https://...?articleNo=2619530650","2619530650"))
      // - cell.l이 있으면 링크 객체 ({Target: "..."})
      const v = cell.v;
      const f = (cell as { f?: string }).f;
      const l = (cell as { l?: { Target?: string } }).l;

      if (f && /HYPERLINK/i.test(f)) {
        // articleNo= 추출 우선, 그 외는 표시값 사용
        const m =
          f.match(/articleNo=(\d+)/) ??
          f.match(/articleno=(\d+)/i) ??
          (l?.Target?.match(/articleNo=(\d+)/i) ?? null);
        if (m) {
          row[header] = m[1];
          continue;
        }
      }

      row[header] = v ?? null;
    }
    rows.push(row);
  }

  return { headers, rows, totalRows: rows.length };
}

/** 한 행 → ParsedListing (사용자 매핑 또는 자동 매핑) */
export function rowToListing(
  row: Record<string, unknown>,
  mapping: Record<string, StandardColumn | null>
): ParsedListing {
  const out: ParsedListing = {
    article_no: null,
    지역: null,
    공급_m2: null,
    전용_m2: null,
    해당층: null,
    전체층: null,
    보증금: null,
    월세: null,
    관리비: null,
    현재업종: null,
    추천업종: null,
    간략설명: null,
    설명: null,
    주소: null,
    사용승인일: null,
    중개사무소명: null,
    raw_data: row,
  };

  // 매핑 적용
  for (const [excelHeader, stdCol] of Object.entries(mapping)) {
    if (!stdCol) continue;
    const v = row[excelHeader];
    const meta = COLUMN_MAPPINGS[stdCol];
    if (meta.type === "number") {
      const n = toNumber(v);
      if (n != null) {
        // 면적 컬럼: 평 단위면 ㎡로 환산
        if (
          (stdCol === "공급_m2" || stdCol === "전용_m2") &&
          n < 1000 &&
          n < 200
        ) {
          // 200 미만이면 평일 가능성 높음 (일반 상가는 ㎡ 기준 60~200 범위)
          // 정확 휴리스틱: 사용자 지시 = 1000 미만이면 평으로 의심.
          // 그러나 일반 ㎡ 값도 50~500 사이라 단순 임계값은 위험.
          // 안전: 평이면 m2로 환산 (× 3.3058). 단 raw 값이 매우 작을 때(< 50) 만.
          if (n < 50) {
            (out[stdCol] as number) = Math.round(n * 3.3058 * 10) / 10;
          } else {
            (out[stdCol] as number) = n;
          }
        } else {
          // 금액 등
          (out[stdCol] as number) = n;
        }
      }
    } else if (meta.type === "date") {
      const d = toDate(v);
      if (d) (out[stdCol] as string) = d;
    } else {
      const s = toStr(v);
      if (s) (out[stdCol] as string) = s;
    }
  }

  // article_no 정규화: HYPERLINK 처리 시 이미 추출됐을 것
  if (out.article_no) {
    const m = String(out.article_no).match(/(\d{6,})/);
    if (m) out.article_no = m[1];
  }

  // 본문에서 지역 자동 추출 (지역 컬럼 비어있을 때만)
  if (!out.지역) {
    const haystack = [
      out.간략설명,
      out.설명,
      out.주소,
      out.중개사무소명,
    ]
      .filter((x): x is string => typeof x === "string")
      .join(" ");
    for (const keyword of EXTRACTION_RULES.지역_from_설명) {
      if (haystack.includes(keyword)) {
        // "삼성역" → "삼성동" 변환 (역명을 동명으로)
        out.지역 = keyword.replace(/역$/, "동");
        break;
      }
    }
  }

  // 본문에서 관리비 정규식 추출 (관리비 컬럼 비어있을 때만)
  if (out.관리비 == null && out.설명) {
    for (const pattern of EXTRACTION_RULES.관리비_from_설명) {
      const m = out.설명.match(pattern);
      if (m && m[1]) {
        const n = parseInt(m[1].replace(/,/g, ""), 10);
        if (Number.isFinite(n)) {
          out.관리비 = n * 10000; // "30만" → 300000원
          break;
        }
      }
    }
  }

  return out;
}

function toNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.\-]/g, "");
    if (!cleaned) return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStr(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v).trim();
}

function toDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date
    const ms = (v - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof v === "string") {
    const s = v.replace(/\./g, "-").trim();
    const d = new Date(s);
    if (Number.isFinite(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

/** 편의 함수 — 헤더 자동 매핑 */
export { autoMapHeaders };
