/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Puppeteer / Chromium은 native binary라 Next 번들링에서 제외해야 함
    // (Vercel serverless 환경에서 @sparticuz/chromium 정상 로드)
    serverComponentsExternalPackages: [
      "puppeteer",
      "puppeteer-core",
      "@sparticuz/chromium",
    ],
  },

  // 서버 함수 빌드 시 정적 자산 포함 보장
  // (lib/pdf-templates/proposal.html, assets/industry_marriage.json 런타임 fs 접근)
  outputFileTracingIncludes: {
    "/api/generate-pdf/**/*": [
      "./lib/pdf-templates/**/*",
      "./assets/**/*",
    ],
    "/api/search/**/*": ["./assets/**/*"],
  },

  // 이미지 도메인 (현재는 사용 안 하지만 추후 확장 대비)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
