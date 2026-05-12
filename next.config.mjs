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

  // 서버 함수 빌드 시 정적 자산 + native binary 포함 보장
  outputFileTracingIncludes: {
    "/api/generate-pdf/**/*": [
      // 런타임 fs.readFile 대상
      "./lib/pdf-templates/**/*",
      "./assets/**/*",
      // ⭐ Chromium 바이너리 + 의존 .so 라이브러리 (libnss3, libnssutil3, libnspr4 등)
      // 이게 빠지면 Vercel function 안에서 chromium 실행 시
      //   "libnss3.so: cannot open shared object file"
      // 같은 에러 발생.
      "./node_modules/@sparticuz/chromium/bin/**/*",
    ],
    "/api/search/**/*": ["./assets/**/*"],
  },

  // 이미지 도메인 (현재는 사용 안 하지만 추후 확장 대비)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
