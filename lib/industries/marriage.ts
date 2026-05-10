// 결혼식장 업종 특화 가중치
//
// 결혼식장 매물 평가 기준:
//   - 큰 면적 필수 (50평 이상)
//   - 1층 또는 메인층
//   - 신축·리모델링 (낡은 건물 비선호)
//   - 주차 / 접근성

import type { IndustryWeights } from "../scoring";

export const MARRIAGE_WEIGHTS: IndustryWeights = {
  area: 0.3,            // 가장 중요
  floor: 0.1,
  rent: 0.1,
  deposit: 0.1,
  age: 0.15,            // 건물 신축성
  industry_match: 0.1,
  region: 0.15,
  parking: 0.1,
};

// 결혼식장 적정 면적 (m²)
export const MARRIAGE_MIN_M2 = 165; // 약 50평
export const MARRIAGE_PREFERRED_M2 = 330; // 약 100평
