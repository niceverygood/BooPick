import Link from "next/link";
import Image from "next/image";

const NAV = [
  { href: "/agent", label: "대시보드" },
  { href: "/agent/leads", label: "임차인" },
  { href: "/agent/listings", label: "매물" },
  { href: "/agent/auto-content", label: "광고" },
  { href: "/agent/analytics", label: "통계" },
  { href: "/agent/billing", label: "구독" },
];

export default function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 sm:gap-6">
          <Link
            href="/agent"
            className="flex items-center gap-2 shrink-0"
          >
            <Image
              src="/img/icon-192.png"
              alt="부픽"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="font-bold text-boopick-navy text-sm">
              부픽 <span className="text-slate-400 font-normal">중개사</span>
            </span>
          </Link>

          <nav className="flex-1 flex gap-1 overflow-x-auto -mx-2 px-2 scrollbar-none">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-boopick-navy whitespace-nowrap font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-boopick-navy whitespace-nowrap"
          >
            임차인 화면 →
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
