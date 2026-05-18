import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://boo-pick.vercel.app";
const SITE_TITLE = "부픽 (BooPick) — 매물 분석 SaaS";
const SITE_DESC =
  "공인중개사 보유 매물 데이터를 의뢰 조건에 맞춰 분석하고 PDF 리포트로 출력하는 SaaS 도구. 매물 40,000건을 30초에 분석.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/img/favicon.ico", sizes: "any" },
      { url: "/img/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/img/icon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/img/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/img/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESC,
    siteName: "부픽",
    images: [
      {
        url: "/img/og-image.png",
        width: 1200,
        height: 630,
        alt: "부픽 — 공인중개사 매물 분석 SaaS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESC,
    images: ["/img/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#1A2E4C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
