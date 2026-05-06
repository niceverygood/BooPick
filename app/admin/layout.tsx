import Link from "next/link";
import Image from "next/image";

const NAV = [
  { href: "/admin", label: "운영" },
  { href: "/admin/funnel", label: "Funnel" },
  { href: "/admin/ad-spend", label: "광고비" },
  { href: "/admin/agencies", label: "중개사" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <Image
              src="/img/icon-192.png"
              alt="부픽"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="font-bold text-boopick-navy text-sm">
              부픽 <span className="text-red-500 font-normal">운영자</span>
            </span>
          </Link>
          <nav className="flex-1 flex gap-1 overflow-x-auto -mx-2 px-2">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-sm px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-boopick-navy whitespace-nowrap font-medium"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-boopick-navy whitespace-nowrap"
          >
            임차인 →
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
