import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/dashboard", label: "홈" },
  { href: "/dashboard/upload", label: "업로드" },
  { href: "/dashboard/search", label: "검색" },
  { href: "/dashboard/reports", label: "리포트" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // env 미설정이거나 미로그인 시 로그인 페이지로
  let userEmail: string | null = null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    userEmail = user.email ?? null;
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Image
              src="/img/icon-192.png"
              alt="부픽"
              width={28}
              height={28}
              className="rounded-md"
            />
            <span className="font-bold text-boopick-navy text-sm">부픽</span>
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
          <span className="text-xs text-slate-400 hidden sm:inline">
            {userEmail}
          </span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
