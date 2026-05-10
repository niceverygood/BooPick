// 클라이언트/서버 양쪽에서 import 가능한 ParsedQuery 타입·상수.
//
// 분리 이유: lib/query-parser.ts는 lib/claude.ts(Anthropic SDK + fs)를 import하므로
// 클라이언트 컴포넌트에서 직접 import 시 webpack이 fs/promises를 못 찾는 문제 발생.

export interface ParsedQuery {
  industry: string | null;
  regions: string[];
  exclude_regions: string[];
  area_min_평: number | null;
  area_max_평: number | null;
  area_연층_허용: boolean;
  rent_max_total_만원: number | null;
  rent_max_월세_만원: number | null;
  deposit_max_억: number | null;
  employee_count: number | null;
  max_age_year: number | null;
  min_year: number | null;
  move_in_month: string | null;
  parking_required: boolean;
  additional_notes: string[];
}

export const EMPTY_PARSED: ParsedQuery = {
  industry: null,
  regions: [],
  exclude_regions: [],
  area_min_평: null,
  area_max_평: null,
  area_연층_허용: false,
  rent_max_total_만원: null,
  rent_max_월세_만원: null,
  deposit_max_억: null,
  employee_count: null,
  max_age_year: null,
  min_year: null,
  move_in_month: null,
  parking_required: false,
  additional_notes: [],
};
