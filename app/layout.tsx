import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "부픽 (BooPick) — 매물 분석 SaaS",
  description:
    "공인중개사 매물 데이터 40,000건을 30초 안에 분석해 업종 맞춤 리포트로 받아보세요.",
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
