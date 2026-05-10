// xlsx 파일 → listings 행 매핑
//
// 사용 예:
//   import * as XLSX from "xlsx";
//   const wb = XLSX.read(buffer);
//   const rows = parseExcel(wb);
//
// AI 컬럼 자동 매핑은 추후 (현재는 한글 컬럼명 그대로 매칭).

import * as XLSX from "xlsx";

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

const COLUMN_ALIAS: Record<keyof ParsedListing, string[]> = {
  article_no: ["매물번호", "번호", "ID", "id"],
  지역: ["지역", "동", "지역명"],
  공급_m2: ["공급/계약/대지", "공급면적", "공급m2", "공급(㎡)"],
  전용_m2: ["전용/연", "전용면적", "전용m2", "전용(㎡)"],
  해당층: ["해당층", "층"],
  전체층: ["전체층", "총층"],
  보증금: ["보증금", "전세금"],
  월세: ["월세"],
  관리비: ["관리비"],
  현재업종: ["현재업종", "업종"],
  추천업종: ["추천업종", "추천"],
  간략설명: ["간략설명", "요약"],
  설명: ["설명", "상세설명", "본문"],
  주소: ["주소", "도로명주소"],
  사용승인일: ["사용승인일", "준공일"],
  중개사무소명: ["중개사무소명", "중개사", "사무소"],
  raw_data: [],
};

function pickValue(
  row: Record<string, unknown>,
  aliases: string[]
): unknown | null {
  for (const a of aliases) {
    if (a in row && row[a] != null && row[a] !== "") return row[a];
  }
  return null;
}

function toNum(v: unknown): number | null {
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
  // Excel serial date 또는 ISO 문자열
  if (typeof v === "number") {
    // Excel epoch (1900-01-01 = 1)
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

export function parseExcel(workbook: XLSX.WorkBook): ParsedListing[] {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
  });

  return rows.map((row) => {
    const out: ParsedListing = {
      article_no: toStr(pickValue(row, COLUMN_ALIAS.article_no)),
      지역: toStr(pickValue(row, COLUMN_ALIAS.지역)),
      공급_m2: toNum(pickValue(row, COLUMN_ALIAS.공급_m2)),
      전용_m2: toNum(pickValue(row, COLUMN_ALIAS.전용_m2)),
      해당층: toStr(pickValue(row, COLUMN_ALIAS.해당층)),
      전체층: toStr(pickValue(row, COLUMN_ALIAS.전체층)),
      보증금: toNum(pickValue(row, COLUMN_ALIAS.보증금)),
      월세: toNum(pickValue(row, COLUMN_ALIAS.월세)),
      관리비: toNum(pickValue(row, COLUMN_ALIAS.관리비)),
      현재업종: toStr(pickValue(row, COLUMN_ALIAS.현재업종)),
      추천업종: toStr(pickValue(row, COLUMN_ALIAS.추천업종)),
      간략설명: toStr(pickValue(row, COLUMN_ALIAS.간략설명)),
      설명: toStr(pickValue(row, COLUMN_ALIAS.설명)),
      주소: toStr(pickValue(row, COLUMN_ALIAS.주소)),
      사용승인일: toDate(pickValue(row, COLUMN_ALIAS.사용승인일)),
      중개사무소명: toStr(pickValue(row, COLUMN_ALIAS.중개사무소명)),
      raw_data: row,
    };
    return out;
  });
}
