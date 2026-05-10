import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminUserActions } from "@/components/admin-user-actions";

export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  email: string | null;
  name: string | null;
  tier: "basic" | "pro";
  reports_used_month: number;
  reports_reset_at: string | null;
  created_at: string;
}

interface BetaRequestRow {
  id: string;
  user_id: string;
  company: string | null;
  experience_years: number | null;
  current_tools: string | null;
  use_case: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

async function fetchAdminData(): Promise<{
  profiles: ProfileRow[];
  pendingRequests: BetaRequestRow[];
}> {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: requests }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, name, tier, reports_used_month, reports_reset_at, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("beta_requests")
      .select("id, user_id, company, experience_years, current_tools, use_case, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  return {
    profiles: (profiles as ProfileRow[] | null) ?? [],
    pendingRequests: (requests as BetaRequestRow[] | null) ?? [],
  };
}

export default async function AdminUsersPage() {
  const { profiles, pendingRequests } = await fetchAdminData();

  // user_id → 가장 최근 pending request id 매핑
  const pendingByUser = new Map<string, BetaRequestRow>();
  for (const r of pendingRequests) {
    if (!pendingByUser.has(r.user_id)) pendingByUser.set(r.user_id, r);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-boopick-navy">
          사용자 관리
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {profiles.length}명 · Pro {profiles.filter((p) => p.tier === "pro").length}명 ·
          Pro 신청 대기 {pendingRequests.length}건
        </p>
      </div>

      {/* Pro 신청 대기열 */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-boopick-navy mb-4">
              📨 Pro 베타 신청 대기 ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((r) => {
                const user = profiles.find((p) => p.id === r.user_id);
                return (
                  <div
                    key={r.id}
                    className="border border-slate-200 rounded-md p-4 bg-amber-50/30"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-boopick-navy">
                          {user?.name ?? "—"}{" "}
                          <span className="text-xs font-normal text-slate-500">
                            ({user?.email ?? "—"})
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {r.company ?? "소속 미입력"} ·{" "}
                          {r.experience_years != null
                            ? `업력 ${r.experience_years}년`
                            : "업력 미입력"}
                        </p>
                        {r.current_tools && (
                          <p className="text-xs text-slate-500 mt-1">
                            도구: {r.current_tools}
                          </p>
                        )}
                        {r.use_case && (
                          <p className="text-xs text-slate-500 mt-1">
                            케이스: {r.use_case}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(r.created_at).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      <AdminUserActions
                        userId={r.user_id}
                        currentTier={user?.tier ?? "basic"}
                        betaRequestId={r.id}
                        compact
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 사용자 목록 */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-3 px-4">이메일</th>
                  <th className="text-left py-3 px-4">이름</th>
                  <th className="text-center py-3 px-4">티어</th>
                  <th className="text-right py-3 px-4">사용량</th>
                  <th className="text-left py-3 px-4">가입일</th>
                  <th className="text-right py-3 px-4">관리</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-none hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {p.email ?? "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{p.name ?? "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        className={
                          p.tier === "pro"
                            ? "bg-boopick-orange text-white border-none"
                            : "bg-slate-200 text-slate-700 border-none"
                        }
                      >
                        {p.tier === "pro" ? "PRO" : "BASIC"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600 tabular-nums">
                      {p.reports_used_month}건
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(p.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-3 px-4">
                      <AdminUserActions
                        userId={p.id}
                        currentTier={p.tier}
                        betaRequestId={pendingByUser.get(p.id)?.id ?? null}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
