import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/tier-check";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin/users", label: "사용자" },
  { href: "/admin/crawler", label: "크롤러" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin/users");
  if (!isAdmin(profile)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-boopick-navy text-white">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/users" className="text-base font-bold">
              부픽 어드민
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-white/80 hover:text-white"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="text-xs text-white/60">{profile.email}</div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-5 sm:p-6">{children}</main>
    </div>
  );
}
