# 부픽 스토어 자산 (자동 생성)

자동 생성 스크립트: `scripts/generate-store-assets.ts`
재생성: `npx tsx scripts/generate-store-assets.ts`

## 디렉토리

- `apple/` — App Store + iOS 디바이스 아이콘 (14개)
- `google/` — Play Store + Android adaptive (8개, FeatureGraphic 포함)
- `pwa/` — 추가 PWA 사이즈 (4개)
- `splash/` — iOS Safari Web App 시작 이미지 (6개)

## ⚠ 자동 생성되지 않는 자산

- App Store / Play Store 스크린샷 → 실제 앱 화면 캡처 필요
- App Preview 영상 (선택) → 화면 녹화
