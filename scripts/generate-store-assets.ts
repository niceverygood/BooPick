// 부픽 브랜드 자산 일괄 생성기
//
// 마스터 자산:
//   public/img/icon.svg              — 메인 아이콘 (1024×1024)
//   public/img/icon-maskable.svg     — Android adaptive (safe zone 포함)
//   assets/feature-graphic.svg       — Google Play 기능 그래픽 1024×500
//
// 출력:
//   public/store-assets/
//     ├── apple/        — iOS / Apple App Store 사이즈
//     ├── google/       — Android / Google Play 사이즈
//     ├── pwa/          — 추가 PWA 사이즈
//     └── splash/       — iOS Web App splash (Safari)
//
// 실행: npx tsx scripts/generate-store-assets.ts

import sharp from "sharp";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const ROOT = process.cwd();
const SRC_ICON = join(ROOT, "public", "img", "icon.svg");
const SRC_MASKABLE = join(ROOT, "public", "img", "icon-maskable.svg");
const SRC_FEATURE = join(ROOT, "assets", "feature-graphic.svg");
const OUT = join(ROOT, "public", "store-assets");

// ────────────────────────────────────────────────────────────
// 사이즈 정의

interface IconSize {
  size: number;
  filename: string;
  /** App Store는 alpha 채널 비허용 → background 채움 */
  flatten?: boolean;
}

// Apple — App Store + iOS 디바이스 전체
const APPLE: IconSize[] = [
  // App Store Connect 마스터 (alpha 비허용, 1024 RGB)
  { size: 1024, filename: "AppStore-1024.png", flatten: true },
  // iPhone Home Screen
  { size: 180, filename: "iPhone-180@3x.png" },
  { size: 120, filename: "iPhone-120@2x.png" },
  // iPad
  { size: 167, filename: "iPad-Pro-167@2x.png" },
  { size: 152, filename: "iPad-152@2x.png" },
  { size: 76, filename: "iPad-76@1x.png" },
  // Spotlight
  { size: 80, filename: "Spotlight-80@2x.png" },
  { size: 40, filename: "Spotlight-40@1x.png" },
  // Settings
  { size: 58, filename: "Settings-58@2x.png" },
  { size: 87, filename: "Settings-87@3x.png" },
  { size: 29, filename: "Settings-29@1x.png" },
  // Notification
  { size: 60, filename: "Notification-60@3x.png" },
  { size: 40, filename: "Notification-40@2x.png" },
  { size: 20, filename: "Notification-20@1x.png" },
];

// Google — Play Store + Android Adaptive
const GOOGLE: IconSize[] = [
  // Play Store 메인 (alpha 가능, 32-bit)
  { size: 512, filename: "PlayStore-512.png" },
  // Adaptive launcher (Android 8.0+)
  { size: 192, filename: "android-xxxhdpi-192.png" },
  { size: 144, filename: "android-xxhdpi-144.png" },
  { size: 96, filename: "android-xhdpi-96.png" },
  { size: 72, filename: "android-hdpi-72.png" },
  { size: 48, filename: "android-mdpi-48.png" },
  { size: 36, filename: "android-ldpi-36.png" },
];

// 추가 PWA / 웹 사이즈
const PWA: IconSize[] = [
  { size: 256, filename: "icon-256.png" },
  { size: 384, filename: "icon-384.png" },
  { size: 96, filename: "icon-96.png" },
  { size: 72, filename: "icon-72.png" },
];

// iOS Safari Web App splash screens (apple-touch-startup-image)
//   가로/세로 디바이스 사이즈 매핑.
const IOS_SPLASH: { w: number; h: number; filename: string }[] = [
  // iPhone 15 Pro Max / 14 Pro Max / 14 Plus
  { w: 1290, h: 2796, filename: "iPhone-Pro-Max-portrait.png" },
  // iPhone 15 / 14 / 13 Pro
  { w: 1179, h: 2556, filename: "iPhone-Standard-portrait.png" },
  // iPhone 13/12 Pro Max
  { w: 1284, h: 2778, filename: "iPhone-XR-Plus-portrait.png" },
  // iPhone XR / 11
  { w: 828, h: 1792, filename: "iPhone-XR-portrait.png" },
  // iPad Pro 12.9
  { w: 2048, h: 2732, filename: "iPad-Pro-12-portrait.png" },
  // iPad Pro 11 / Air
  { w: 1668, h: 2388, filename: "iPad-Pro-11-portrait.png" },
];

// ────────────────────────────────────────────────────────────

async function generateIcon(
  src: Buffer,
  outDir: string,
  spec: IconSize
): Promise<void> {
  let pipe = sharp(src).resize(spec.size, spec.size, {
    fit: "contain",
    background: { r: 26, g: 46, b: 76, alpha: 1 }, // boopick navy
  });
  if (spec.flatten) {
    pipe = pipe.flatten({ background: { r: 26, g: 46, b: 76 } });
  }
  await pipe.png({ compressionLevel: 9 }).toFile(join(outDir, spec.filename));
  console.log(`  ✓ ${spec.filename} (${spec.size}×${spec.size})`);
}

async function generateSplash(
  src: Buffer,
  outDir: string,
  spec: { w: number; h: number; filename: string }
): Promise<void> {
  // splash는 배경 가운데 정렬된 작은 아이콘 (전체의 1/3)
  const iconSize = Math.round(Math.min(spec.w, spec.h) / 3);
  const iconBuf = await sharp(src)
    .resize(iconSize, iconSize, { fit: "contain" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: spec.w,
      height: spec.h,
      channels: 4,
      background: { r: 26, g: 46, b: 76, alpha: 1 },
    },
  })
    .composite([{ input: iconBuf, gravity: "center" }])
    .flatten({ background: { r: 26, g: 46, b: 76 } })
    .png({ compressionLevel: 9 })
    .toFile(join(outDir, spec.filename));
  console.log(`  ✓ ${spec.filename} (${spec.w}×${spec.h})`);
}

async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

async function main() {
  const iconSvg = await readFile(SRC_ICON);
  const maskableSvg = await readFile(SRC_MASKABLE);
  const featureSvg = await readFile(SRC_FEATURE);

  const dirApple = join(OUT, "apple");
  const dirGoogle = join(OUT, "google");
  const dirPwa = join(OUT, "pwa");
  const dirSplash = join(OUT, "splash");
  await Promise.all([
    ensureDir(dirApple),
    ensureDir(dirGoogle),
    ensureDir(dirPwa),
    ensureDir(dirSplash),
  ]);

  console.log("\n[Apple] App Store + iOS 디바이스");
  for (const s of APPLE) await generateIcon(iconSvg, dirApple, s);

  console.log("\n[Google] Play Store + Android adaptive");
  // Play Store는 일반 아이콘, Adaptive는 maskable 사용
  await generateIcon(iconSvg, dirGoogle, GOOGLE[0]); // 512 메인
  for (const s of GOOGLE.slice(1)) {
    await generateIcon(maskableSvg, dirGoogle, s);
  }

  console.log("\n[Google] Feature Graphic 1024×500");
  await sharp(featureSvg)
    .resize(1024, 500)
    .flatten({ background: { r: 26, g: 46, b: 76 } })
    .png({ compressionLevel: 9 })
    .toFile(join(dirGoogle, "FeatureGraphic-1024x500.png"));
  console.log("  ✓ FeatureGraphic-1024x500.png");

  console.log("\n[PWA] 추가 사이즈");
  for (const s of PWA) await generateIcon(iconSvg, dirPwa, s);

  console.log("\n[Splash] iOS Safari Web App");
  for (const s of IOS_SPLASH) await generateSplash(iconSvg, dirSplash, s);

  // 자동 생성 메모
  await writeFile(
    join(OUT, "README.md"),
    `# 부픽 스토어 자산 (자동 생성)\n\n` +
      `자동 생성 스크립트: \`scripts/generate-store-assets.ts\`\n` +
      `재생성: \`npx tsx scripts/generate-store-assets.ts\`\n\n` +
      `## 디렉토리\n\n` +
      `- \`apple/\` — App Store + iOS 디바이스 아이콘 (${APPLE.length}개)\n` +
      `- \`google/\` — Play Store + Android adaptive (${GOOGLE.length + 1}개, FeatureGraphic 포함)\n` +
      `- \`pwa/\` — 추가 PWA 사이즈 (${PWA.length}개)\n` +
      `- \`splash/\` — iOS Safari Web App 시작 이미지 (${IOS_SPLASH.length}개)\n\n` +
      `## ⚠ 자동 생성되지 않는 자산\n\n` +
      `- App Store / Play Store 스크린샷 → 실제 앱 화면 캡처 필요\n` +
      `- App Preview 영상 (선택) → 화면 녹화\n`,
    "utf-8"
  );

  console.log(`\n✅ 모든 자산 생성 완료 → ${OUT}`);
}

main().catch((e) => {
  console.error("자산 생성 실패:", e);
  process.exit(1);
});
