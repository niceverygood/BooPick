import { callClaudeJSON, loadPrompt } from "@/lib/claude";

export type BuildingType = "상가" | "사무실" | "주거" | "토지";
export type TransactionType = "매매" | "전세" | "월세" | "단기";

const BUILDING_TYPES: readonly BuildingType[] = ["상가", "사무실", "주거", "토지"];
const TRANSACTION_TYPES: readonly TransactionType[] = ["매매", "전세", "월세", "단기"];

export interface Region {
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
}

export interface RangeMinMax {
  min: number | null;
  max: number | null;
}

export interface FloorRange extends RangeMinMax {
  exact: number | null;
}

export interface ParsedQuery {
  region: Region;
  building_type: BuildingType | null;
  transaction_type: TransactionType | null;
  area_pyeong: RangeMinMax;
  floor: FloorRange;
  deposit: RangeMinMax;
  monthly_rent: RangeMinMax;
  premium_required: boolean | null;
  industries: string[];
  facilities: string[];
  location_features: string[];
  condition: string[];
}

export interface ParseQueryInput {
  query: string;
  useHaiku?: boolean;
}

export interface ParseQueryResult {
  parsed: ParsedQuery;
  tokens: { input: number; output: number };
}

export const EMPTY_PARSED: ParsedQuery = {
  region: { sido: null, sigungu: null, dong: null },
  building_type: null,
  transaction_type: null,
  area_pyeong: { min: null, max: null },
  floor: { min: null, max: null, exact: null },
  deposit: { min: null, max: null },
  monthly_rent: { min: null, max: null },
  premium_required: null,
  industries: [],
  facilities: [],
  location_features: [],
  condition: [],
};

export async function parseQuery(
  input: ParseQueryInput
): Promise<ParseQueryResult> {
  const systemPrompt = await loadPrompt("parse-query");

  const result = await callClaudeJSON<Partial<ParsedQuery>>({
    systemPrompt,
    userMessage: input.query,
    maxTokens: 600,
    useHaiku: input.useHaiku,
  });

  return { parsed: normalize(result.data), tokens: result.tokens };
}

function normalize(raw: Partial<ParsedQuery>): ParsedQuery {
  const r = (raw.region ?? {}) as Partial<Region>;
  return {
    region: {
      sido: nullableString(r.sido),
      sigungu: nullableString(r.sigungu),
      dong: nullableString(r.dong),
    },
    building_type: nullableEnum(raw.building_type, BUILDING_TYPES),
    transaction_type: nullableEnum(raw.transaction_type, TRANSACTION_TYPES),
    area_pyeong: minMax(raw.area_pyeong),
    floor: floorRange(raw.floor),
    deposit: minMax(raw.deposit),
    monthly_rent: minMax(raw.monthly_rent),
    premium_required:
      typeof raw.premium_required === "boolean" ? raw.premium_required : null,
    industries: arrayOfStrings(raw.industries),
    facilities: arrayOfStrings(raw.facilities),
    location_features: arrayOfStrings(raw.location_features),
    condition: arrayOfStrings(raw.condition),
  };
}

function nullableString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function numberOrNull(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return v;
}

function nullableEnum<T extends string>(
  v: unknown,
  allowed: readonly T[]
): T | null {
  if (typeof v !== "string") return null;
  return (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

function minMax(v: unknown): RangeMinMax {
  if (typeof v !== "object" || v === null) return { min: null, max: null };
  const obj = v as { min?: unknown; max?: unknown };
  return { min: numberOrNull(obj.min), max: numberOrNull(obj.max) };
}

function floorRange(v: unknown): FloorRange {
  if (typeof v !== "object" || v === null)
    return { min: null, max: null, exact: null };
  const obj = v as { min?: unknown; max?: unknown; exact?: unknown };
  return {
    min: numberOrNull(obj.min),
    max: numberOrNull(obj.max),
    exact: numberOrNull(obj.exact),
  };
}

function arrayOfStrings(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}
