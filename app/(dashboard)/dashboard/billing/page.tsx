// 구독 관리 + 결제 이력
//
// /dashboard/billing
//   - active subscription 표시 + 해지 버튼
//   - 결제 이력 테이블 (최근 24건)

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/tier-check";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CancelSubscriptionButton } from "@/components/cancel-subscription-button";

export const dynamic = "force-dynamic";

interface Subscription {
  id: string;
  cid: string;
  sid: string;
  plan: string;
  amount_per_cycle: number;
  status: "active" | "inactive" | "paused";
  started_at: string;
  last_charged_at: string | null;
  next_charge_at: string | null;
  inactive_at: string | null;
  inactive_reason: string | null;
}

interface Payment {
  id: string;
  type: "onetime" | "subscription_first" | "subscription_recurring";
  item_name: string;
  total_amount: number;
  status: "ready" | "approved" | "canceled" | "failed" | "refunded";
  payment_method_type: string | null;
  approved_at: string | null;
  created_at: string;
}

export default async function BillingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/dashboard/billing");

  const supabase = createClient();
  const [{ data: subs }, { data: payments }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  const subscriptions = (subs as Subscription[] | null) ?? [];
  const paymentList = (payments as Payment[] | null) ?? [];
  const activeSub = subscriptions.find((s) => s.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-boopick-navy">구독 관리</h1>
        <p className="text-sm text-slate-500 mt-1">
          정기 구독 상태와 결제 이력을 확인하고 해지할 수 있습니다.
        </p>
      </div>

      {/* Active subscription */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-boopick-navy mb-4">
            현재 구독
          </h2>
          {activeSub ? (
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-boopick-orange text-white border-none">
                    {activeSub.plan.toUpperCase()}
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-700 border-none">
                    Active
                  </Badge>
                </div>
                <p className="text-lg font-bold text-boopick-navy">
                  {activeSub.amount_per_cycle.toLocaleString()}원 / 월
                </p>
                <p className="text-xs text-slate-500">
                  시작:{" "}
                  {new Date(activeSub.started_at).toLocaleDateString("ko-KR")}
                </p>
                {activeSub.next_charge_at && (
                  <p className="text-xs text-slate-500">
                    다음 결제일:{" "}
                    <strong className="text-boopick-navy">
                      {new Date(activeSub.next_charge_at).toLocaleDateString(
                        "ko-KR"
                      )}
                    </strong>
                  </p>
                )}
              </div>
              <CancelSubscriptionButton subscriptionId={activeSub.id} />
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 mb-4">
                활성 구독이 없습니다.
              </p>
              <Button
                asChild
                className="bg-boopick-orange hover:bg-boopick-orange/90 text-white"
              >
                <Link href="/checkout">Pro 구독 시작하기</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 해지된 / 과거 구독 */}
      {subscriptions.filter((s) => s.status !== "active").length > 0 && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-base font-bold text-slate-600 mb-4">
              지난 구독
            </h2>
            <div className="space-y-2">
              {subscriptions
                .filter((s) => s.status !== "active")
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-100 last:border-none py-2"
                  >
                    <span>
                      {s.plan.toUpperCase()} · {s.amount_per_cycle.toLocaleString()}원/월 ·{" "}
                      {new Date(s.started_at).toLocaleDateString("ko-KR")} ~{" "}
                      {s.inactive_at
                        ? new Date(s.inactive_at).toLocaleDateString("ko-KR")
                        : "—"}
                    </span>
                    <Badge className="bg-slate-100 text-slate-500 border-none">
                      {s.status === "inactive" ? "해지됨" : "일시정지"}
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 결제 이력 */}
      <Card>
        <CardContent className="p-0">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-boopick-navy">
              결제 이력 (최근 {paymentList.length}건)
            </h2>
          </div>
          {paymentList.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-10">
              결제 이력이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left py-2.5 px-4">결제일</th>
                    <th className="text-left py-2.5 px-4">상품</th>
                    <th className="text-center py-2.5 px-4">유형</th>
                    <th className="text-right py-2.5 px-4">금액</th>
                    <th className="text-center py-2.5 px-4">상태</th>
                    <th className="text-left py-2.5 px-4">수단</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentList.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 last:border-none hover:bg-slate-50"
                    >
                      <td className="py-2 px-4 text-xs text-slate-600">
                        {new Date(p.approved_at ?? p.created_at).toLocaleString("ko-KR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-2 px-4 text-slate-700">{p.item_name}</td>
                      <td className="py-2 px-4 text-center">
                        <Badge
                          className={
                            p.type === "onetime"
                              ? "bg-slate-100 text-slate-700 border-none"
                              : "bg-amber-100 text-amber-800 border-none"
                          }
                        >
                          {p.type === "onetime" ? "단건" : "정기"}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-right tabular-nums text-slate-700">
                        {p.total_amount.toLocaleString()}원
                      </td>
                      <td className="py-2 px-4 text-center">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-2 px-4 text-xs text-slate-500">
                        {p.payment_method_type ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: Payment["status"] }) {
  const map: Record<Payment["status"], { label: string; cls: string }> = {
    approved: { label: "결제완료", cls: "bg-emerald-100 text-emerald-700" },
    ready: { label: "진행중", cls: "bg-amber-100 text-amber-700" },
    canceled: { label: "취소", cls: "bg-slate-100 text-slate-600" },
    failed: { label: "실패", cls: "bg-red-100 text-red-600" },
    refunded: { label: "환불", cls: "bg-blue-100 text-blue-700" },
  };
  const { label, cls } = map[status];
  return <Badge className={`${cls} border-none`}>{label}</Badge>;
}
