// 부픽 데모용 손으로 만든 매물 10건. 강남권 다양한 동·업종·평수.
// scripts/seed 또는 /api/admin/seed에서 사용.

export type BuildingType = "상가" | "사무실" | "주거" | "토지";
export type TransactionType = "매매" | "전세" | "월세" | "단기";

export interface DemoListing {
  address: string;
  dong: string;
  building_name?: string;
  area_pyeong: number;
  area_sqm: number;
  floor: number;
  total_floors?: number;
  building_type: BuildingType;
  transaction_type: TransactionType;
  deposit: number;
  monthly_rent: number;
  premium?: number;
  description: string;
  short_description: string;
}

export const DEMO_LISTINGS: DemoListing[] = [
  {
    address: "서울 강남구 신사동 545-12",
    dong: "신사동",
    building_name: "가로수길빌딩",
    area_pyeong: 25,
    area_sqm: 82.6,
    floor: 1,
    total_floors: 5,
    building_type: "상가",
    transaction_type: "월세",
    deposit: 80_000_000,
    monthly_rent: 3_500_000,
    description:
      "신사동 가로수길 코너 1층 25평. 통유리로 전면이 시원하게 트여 있고, 테라스 약 5평 별도 보유. 미용실·카페 운영하기 매우 좋은 자리입니다. 신사역 도보 3분, 권리금 없이 즉시 입주 가능. 엘리베이터 있고 주차 2대 가능.",
    short_description: "가로수길 코너 1층, 테라스 카페자리",
  },
  {
    address: "서울 강남구 역삼동 825-1",
    dong: "역삼동",
    building_name: "역삼타워",
    area_pyeong: 30,
    area_sqm: 99.2,
    floor: 6,
    total_floors: 12,
    building_type: "사무실",
    transaction_type: "월세",
    deposit: 50_000_000,
    monthly_rent: 3_000_000,
    description:
      "강남역 7번 출구 도보 5분, 6층 사무실 30평. 풀옵션(책상·의자·회의실 가구) 신규 인테리어로 깔끔하고 즉시 입주 가능. 보증금 5천에 월세 300, 관리비 별도 30만원. 주차 1대 무료. 엘리베이터·CCTV 완비.",
    short_description: "강남역 5분, 30평 풀옵션 사무실",
  },
  {
    address: "서울 강남구 역삼동 712-8",
    dong: "역삼동",
    area_pyeong: 22,
    area_sqm: 72.7,
    floor: 1,
    total_floors: 4,
    building_type: "상가",
    transaction_type: "월세",
    deposit: 70_000_000,
    monthly_rent: 2_800_000,
    premium: 50_000_000,
    description:
      "역삼동 메인도로 1층 22평. 현재 미용실 운영 중인 자리로 권리금 5천. 통유리 전면, 1층 노출 좋고 유동인구 많음. 내부 인테리어 깔끔하게 유지. 샤워실·독립화장실 보유. 강남구청역 도보 4분.",
    short_description: "역삼 1층 미용실 자리, 권리금 5천",
  },
  {
    address: "서울 강남구 압구정동 489-22",
    dong: "압구정동",
    building_name: "로데오프라자",
    area_pyeong: 18,
    area_sqm: 59.5,
    floor: 1,
    total_floors: 3,
    building_type: "상가",
    transaction_type: "월세",
    deposit: 100_000_000,
    monthly_rent: 4_500_000,
    premium: 80_000_000,
    description:
      "압구정 로데오 1층 18평. 카페 영업 중인 자리로 권리금 8천. 코너자리 + 통유리, 야외 테라스 4평 별도. 압구정로데오역 도보 2분. 주변 상권 활발하고 유동인구 많음. 즉시 양도 협의.",
    short_description: "압구정 로데오 1층 카페자리",
  },
  {
    address: "서울 강남구 청담동 87-3",
    dong: "청담동",
    area_pyeong: 28,
    area_sqm: 92.5,
    floor: 1,
    total_floors: 6,
    building_type: "상가",
    transaction_type: "월세",
    deposit: 150_000_000,
    monthly_rent: 5_500_000,
    description:
      "청담동 명품거리 1층 28평. 통유리 전면 + 코너자리로 노출 최강. 옷가게·편집숍·갤러리 운영하기 좋은 입지. 청담역 도보 7분. 권리금 협의, 신축 빌딩 1층이라 인테리어 자유롭게 가능. 주차 3대.",
    short_description: "청담 명품거리 코너 1층 28평",
  },
  {
    address: "서울 송파구 잠실동 40-15",
    dong: "잠실동",
    building_name: "잠실센트럴",
    area_pyeong: 50,
    area_sqm: 165.3,
    floor: 7,
    total_floors: 15,
    building_type: "사무실",
    transaction_type: "월세",
    deposit: 80_000_000,
    monthly_rent: 4_500_000,
    description:
      "잠실역 도보 5분, 7층 사무실 50평. 회의실 2개 + 독립공간 + 탕비실 구성. 풀옵션은 아니지만 인테리어 양호하여 즉시 입주 가능. 주차 2대 무료, 추가 주차장 인근 사용 가능. 보안카드 출입.",
    short_description: "잠실역 5분, 50평 사무실",
  },
  {
    address: "서울 강남구 삼성동 159-22",
    dong: "삼성동",
    area_pyeong: 35,
    area_sqm: 115.7,
    floor: 1,
    total_floors: 4,
    building_type: "상가",
    transaction_type: "월세",
    deposit: 90_000_000,
    monthly_rent: 4_000_000,
    description:
      "삼성동 메인도로변 1층 35평. 학원·병원·약국 운영하기 좋은 자리. 정사각형 구조로 공간 활용도 우수. 삼성중앙역 도보 6분. 주변 학원가 형성되어 있어 시너지 효과. 권리금 없음, 즉시 입주.",
    short_description: "삼성동 메인도로 1층 35평 학원자리",
  },
  {
    address: "서울 강남구 신사동 663-8",
    dong: "신사동",
    area_pyeong: 23,
    area_sqm: 76.0,
    floor: 1,
    total_floors: 3,
    building_type: "상가",
    transaction_type: "월세",
    deposit: 90_000_000,
    monthly_rent: 3_800_000,
    description:
      "도산공원 인근 1층 23평. 옥상 테라스 8평 단독 사용 가능. 카페·베이커리·소규모 레스토랑 운영하기 최적. 권리금 없음, 즉시입주 가능. 압구정역 도보 8분, 도산공원 도보 3분. 한적한 분위기 + 단골 형성하기 좋은 입지.",
    short_description: "도산공원 1층 23평, 옥상 테라스",
  },
  {
    address: "서울 강남구 논현동 132-9",
    dong: "논현동",
    area_pyeong: 16,
    area_sqm: 52.9,
    floor: 1,
    total_floors: 5,
    building_type: "상가",
    transaction_type: "월세",
    deposit: 50_000_000,
    monthly_rent: 2_500_000,
    description:
      "논현동 1층 16평. 네일샵·미용실·소규모 카페 운영하기 적당한 사이즈. 이면도로지만 유동인구 일정. 논현역 도보 5분. 즉시 입주 가능, 권리금 없음. 룸 2개 분리 가능한 구조.",
    short_description: "논현동 1층 16평, 네일샵 자리",
  },
  {
    address: "서울 서초구 양재동 273-1",
    dong: "양재동",
    building_name: "양재타워",
    area_pyeong: 40,
    area_sqm: 132.2,
    floor: 8,
    total_floors: 20,
    building_type: "사무실",
    transaction_type: "월세",
    deposit: 60_000_000,
    monthly_rent: 3_500_000,
    description:
      "양재역 도보 3분, 8층 사무실 40평. 풀옵션(책상·회의실·캐비닛) + 독립공간 구획 완료. 주차 5대 무료 + 방문주차 추가 가능. 신논현 IT 회사 밀집지역. 즉시 입주 가능, 인터넷·전화 회선 완비.",
    short_description: "양재역 3분, 40평 풀옵션 사무실 + 주차 5대",
  },
];
