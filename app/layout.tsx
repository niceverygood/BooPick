import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "부픽 (BooPick)",
  description: "공인중개사를 위한 AI 매물 매칭 + 공동중개 풀",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/img/favicon.ico", sizes: "any" },
      { url: "/img/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/img/icon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/img/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/img/icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "부픽",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A2E4C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
