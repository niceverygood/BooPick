#!/usr/bin/env node
/**
 * 부픽 매물 일괄 임포트 — xlsx 파일에서 listings 테이블로
 *
 * Usage:
 *   npx tsx scripts/import-listings-xlsx.ts <xlsx-path> [options]
 *
 * Options:
 *   --limit N        최대 N개만 처리 (테스트용, 미지정 시 전체)
 *   --concurrency N  동시 처리 수 (기본 5)
 *   --sonnet         Sonnet 4.6 사용 (기본은 Haiku 4.5 — 5~10x 저렴)
 *   --skip-existing  external_id 중복 체크 (기본 true)
 *   --agency-name N  대상 agency 이름 (기본 "부픽 데모 사무소")
 *
 * 환경:
 *   .env.local 자동 로드 (ANTHROPIC_API_KEY, OPENAI_API_KEY,
 *                        NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 */

import { config as dotenvConfig } from "dotenv";
// override: true → Claude Code shell의 빈 ANTHROPIC_API_KEY 등을 .env.local 값으로 덮어씀
dotenvConfig({ path: ".env.local", override: true });

import * as XLSX from "xlsx";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { extractTags } from "../lib/tagging/extract-tags";
import { createEmbedding } from "../lib/openai";

// ====================== CLI 파싱 ======================

const args = process.argv.slice(2);
const xlsxPath = args[0];
if (!xlsxPath || xlsxPath.startsWith("--")) {
  console.error(
    "Usage: npx tsx scripts/import-listings-xlsx.ts <xlsx-path> [--limit N] [--concurrency N] [--sonnet]"
  );
  process.exit(1);
}

function getOpt<T>(flag: string, parse: (s: string) => T, def: T): T {
  const i = args.indexOf(flag);
  if (i < 0 || i + 1 >= args.length) return def;
  return parse(args[i + 1]);
}

const LIMIT = getOpt("--limit", (s) => parseInt(s, 10), Infinity);
const CONCURRENCY = getOpt("--concurrency", (s) => parseInt(s, 10), 5);
const USE_HAIKU = !args.includes("--sonnet");
const AGENCY_NAME = getOpt("--agency-name", (s) => s, "부픽 데모 사무소");

// ====================== Supabase 클라이언트 ======================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY || !process.env.OPENAI_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY / OPENAI_API_KEY 미설정");
  process.exit(1);
}

const admin = createSupabaseClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ====================== xlsx 컬럼 매핑 ======================

interface XlsxRow {
  매물번호?: number | string;
  "공급/계약/대지"?: number | null;
  "전용/연"?: number | null;
  해당층?: string | number | null;
  전체층?: number | null;
  매매대금?: number | null;
  전세금?: number | null;
  월세?: number | null;
  현재업종?: string | null;
  추천업종?: string | null;
  간략설명?: string | null;
  설명?: string | null;
  주소?: string | null;
  사용승인일?: string | null;
}

interface MappedListing {
  external_id: string;
  address: string;
  dong: string | null;
  area_sqm: number | null;
  area_pyeong: number | null;
  floor: number | null;
  total_floors: number | null;
  building_type: "상가" | "사무실" | "주거" | "토지";
  transaction_type: "매매" | "전세" | "월세";
  deposit: number;
  monthly_rent: number;
  description: string;
  short_description: string;
}

function parseFloor(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const basement = s.match(/^B\s*(\d+)$/i);
  if (basement) return -parseInt(basement[1], 10);
  if (/^지하$/.test(s)) return -1;
  const jiha = s.match(/^지하\s*(\d+)/);
  if (jiha) return -parseInt(jiha[1], 10);
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function extractDong(address: string | null | undefined): string | null {
  if (!address) return null;
  // "역삼동", "신사동", "반포동", "방배동" 등 - 동/가/리로 끝나는 첫 토큰
  const tokens = address.split(/\s+/);
  for (const t of tokens) {
    if (/^[가-힣]+동\d?가?$/.test(t)) return t.replace(/\d+가$/, "");
    if (/^[가-힣]+가\d*$/.test(t) && !/구$/.test(t)) return t;
  }
  // fallback: 동으로 끝나는 부분 추출
  const m = address.match(/([가-힣]+동)/);
  return m ? m[1] : null;
}

function inferBuildingType(
  현재: string | null | undefined,
  추천: string | null | undefined
): MappedListing["building_type"] {
  const hint = `${현재 ?? ""} ${추천 ?? ""}`;
  if (/사무실|오피스|업무/.test(hint)) return "사무실";
  if (/주거|원룸|아파트|빌라/.test(hint)) return "주거";
  if (/토지|땅|대지/.test(hint)) return "토지";
  return "상가";
}

function buildTransaction(
  매매: number | null | undefined,
  전세: number | null | undefined,
  월세: number | null | undefined
): { type: "매매" | "전세" | "월세"; deposit: number; monthlyRent: number } | null {
  const m = Number(매매) || 0;
  const j = Number(전세) || 0;
  const w = Number(월세) || 0;
  if (m > 0) return { type: "매매", deposit: m, monthlyRent: 0 };
  if (w > 0) return { type: "월세", deposit: j, monthlyRent: w };
  if (j > 0) return { type: "전세", deposit: j, monthlyRent: 0 };
  return null;
}

function mapRow(row: XlsxRow): MappedListing | null {
  if (!row.매물번호) return null;
  if (!row.주소 || !row.설명) return null;

  const trans = buildTransaction(row.매매대금, row.전세금, row.월세);
  if (!trans) return null;

  const sqm = Number(row["전용/연"]) || null;
  const pyeong = sqm ? Math.round((sqm / 3.3058) * 10) / 10 : null;

  const description = String(row.설명).trim();
  const shortDesc =
    String(row.간략설명 ?? "").trim() ||
    description.slice(0, 100).replace(/\s+/g, " ");

  return {
    external_id: String(row.매물번호),
    address: String(row.주소).trim(),
    dong: extractDong(String(row.주소)),
    area_sqm: sqm,
    area_pyeong: pyeong,
    floor: parseFloor(row.해당층),
    total_floors:
      typeof row.전체층 === "number" ? row.전체층 : parseInt(String(row.전체층 ?? ""), 10) || null,
    building_type: inferBuildingType(row.현재업종, row.추천업종),
    transaction_type: trans.type,
    deposit: trans.deposit,
    monthly_rent: trans.monthlyRent,
    description,
    short_description: shortDesc,
  };
}

// ====================== 처리 ======================

interface Stats {
  total: number;
  processed: number;
  skipped: number;
  errors: number;
  errorSamples: string[];
  inputTokens: number;
  outputTokens: number;
  startedAt: number;
}

const stats: Stats = {
  total: 0,
  processed: 0,
  skipped: 0,
  errors: 0,
  errorSamples: [],
  inputTokens: 0,
  outputTokens: 0,
  startedAt: Date.now(),
};

async function getDemoAgencyId(): Promise<string> {
  const { data: existing } = await admin
    .from("agencies")
    .select("id")
    .eq("name", AGENCY_NAME)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await admin
    .from("agencies")
    .insert({
      name: AGENCY_NAME,
      plan: "pro",
      share_pool_opted_in: true,
    })
    .select("id")
    .single();
  if (error || !created) {
    throw new Error(`agency 생성 실패: ${error?.message}`);
  }
  return created.id;
}

async function processOne(row: XlsxRow, agencyId: string): Promise<void> {
  const mapped = mapRow(row);
  if (!mapped) {
    stats.errors++;
    if (stats.errorSamples.length < 5) {
      stats.errorSamples.push(
        `[skip:invalid] ${row.매물번호 ?? "?"} - ${row.주소 ?? "no addr"}`
      );
    }
    return;
  }

  // idempotent 체크
  const { data: existing } = await admin
    .from("listings")
    .select("id")
    .eq("external_id", mapped.external_id)
    .maybeSingle();
  if (existing?.id) {
    stats.skipped++;
    return;
  }

  try {
    const tagging = await extractTags({
      description: mapped.description,
      shortDescription: mapped.short_description,
      useHaiku: USE_HAIKU,
    });
    stats.inputTokens += tagging.tokens.input;
    stats.outputTokens += tagging.tokens.output;

    const embedText = [mapped.dong, mapped.short_description, mapped.description]
      .filter(Boolean)
      .join("\n");
    const embedding = await createEmbedding(embedText);

    const { error: insertErr } = await admin.from("listings").insert({
      external_id: mapped.external_id,
      agency_id: agencyId,
      address: mapped.address,
      dong: mapped.dong,
      area_pyeong: mapped.area_pyeong,
      area_sqm: mapped.area_sqm,
      floor: mapped.floor,
      total_floors: mapped.total_floors,
      building_type: mapped.building_type,
      transaction_type: mapped.transaction_type,
      deposit: mapped.deposit,
      monthly_rent: mapped.monthly_rent,
      description: mapped.description,
      short_description: mapped.short_description,
      photo_urls: [],
      is_shared: true,
      status: "active",
      source: "csv",
      ai_tags: tagging.tags,
      ai_embedding: embedding,
      ai_processed_at: new Date().toISOString(),
    });

    if (insertErr) {
      stats.errors++;
      if (stats.errorSamples.length < 5) {
        stats.errorSamples.push(
          `[insert] ${mapped.external_id}: ${insertErr.message.slice(0, 100)}`
        );
      }
    } else {
      stats.processed++;
    }
  } catch (e) {
    stats.errors++;
    if (stats.errorSamples.length < 5) {
      stats.errorSamples.push(
        `[ai] ${mapped.external_id}: ${(e instanceof Error ? e.message : String(e)).slice(0, 100)}`
      );
    }
  }
}

function progressLine(): string {
  const done = stats.processed + stats.skipped + stats.errors;
  const elapsed = (Date.now() - stats.startedAt) / 1000;
  const rate = done / elapsed;
  const remaining = rate > 0 ? (stats.total - done) / rate : 0;
  // Haiku 4.5 가격: input $1/M, output $5/M
  const cost = (stats.inputTokens * 1) / 1_000_000 + (stats.outputTokens * 5) / 1_000_000;
  return (
    `[${done}/${stats.total}] ` +
    `✓${stats.processed} skip=${stats.skipped} err=${stats.errors} | ` +
    `${rate.toFixed(1)}/s ETA ${formatDuration(remaining)} | ` +
    `tok in=${stats.inputTokens.toLocaleString()} out=${stats.outputTokens.toLocaleString()} ($${cost.toFixed(2)})`
  );
}

function formatDuration(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "?";
  if (s < 60) return `${s.toFixed(0)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m${(s % 60).toFixed(0)}s`;
  return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
}

async function main() {
  console.log(`xlsx: ${xlsxPath}`);
  console.log(
    `model: ${USE_HAIKU ? "claude-haiku-4-5" : "claude-sonnet-4-6"} | concurrency: ${CONCURRENCY} | limit: ${LIMIT === Infinity ? "all" : LIMIT}`
  );

  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<XlsxRow>(ws);
  const target = rows.slice(0, LIMIT);
  stats.total = target.length;
  console.log(`xlsx total: ${rows.length}, processing: ${stats.total}`);

  const agencyId = await getDemoAgencyId();
  console.log(`agency_id: ${agencyId}\n`);

  // 동시 처리 워커 풀
  let cursor = 0;
  let lastLog = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < target.length) {
      const idx = cursor++;
      await processOne(target[idx], agencyId);

      const done = stats.processed + stats.skipped + stats.errors;
      if (done - lastLog >= 25 || done === target.length) {
        lastLog = done;
        process.stdout.write(progressLine() + "\n");
      }
    }
  });

  await Promise.all(workers);

  console.log("\n=== 완료 ===");
  console.log(progressLine());
  if (stats.errorSamples.length > 0) {
    console.log("\n에러 샘플:");
    stats.errorSamples.forEach((e) => console.log("  " + e));
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
