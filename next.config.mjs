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

    // 서버 함수 빌드 시 정적 자산 + native binary 포함 보장.
    // ⚠️ Next 14.2.x 에서는 반드시 `experimental` 블록 안에 있어야 함.
    //    top-level 에 두면 "Unrecognized key" 경고로 무시되고,
    //    chromium 의 .so 라이브러리가 빠진 채 배포되어
    //    "libnss3.so: cannot open shared object file" 런타임 에러 발생.
    outputFileTracingIncludes: {
      "/api/generate-pdf/**/*": [
        // 런타임 fs.readFile 대상
        "./lib/pdf-templates/**/*",
        "./assets/**/*",
        // ⭐ Chromium 바이너리 + 의존 .so 라이브러리 (libnss3, libnssutil3, libnspr4 등)
        "./node_modules/@sparticuz/chromium/bin/**/*",
      ],
      "/api/search/**/*": ["./assets/**/*"],
      // 어드민 크롤러도 puppeteer 사용
      "/api/admin/crawler/**/*": [
        "./node_modules/@sparticuz/chromium/bin/**/*",
      ],
    },
  },

  // 이미지 도메인 (현재는 사용 안 하지만 추후 확장 대비)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
