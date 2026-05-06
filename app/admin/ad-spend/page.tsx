import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAdminClient } from "@/lib/supabase/server";
import { addAdSpend } from "./actions";

export const dynamic = "force-dynamic";

interface AdSpend {
  id: string;
  date: string;
  channel: string;
  campaign: string | null;
  amount: number;
  notes: string | null;
}

async function fetchSpends(): Promise<AdSpend[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ad_spends")
    .select("id, date, channel, campaign, amount, notes")
    .order("date", { ascending: false })
    .limit(50);
  return (data ?? []) as AdSpend[];
}

export default async function AdSpendPage() {
  const spends = await fetchSpends();
  const total = spends.reduce((a, s) => a + s.amount, 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          광고비 입력
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          채널별 광고비를 수동 입력하면 funnel 대시보드의 CAC 계산에 반영됩니다.
        </p>
      </div>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-base font-bold text-boopick-navy mb-4">새 입력</h2>
          <form
            action={addAdSpend}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div>
              <Label htmlFor="date" className="text-xs">
                일자
              </Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="channel" className="text-xs">
                채널
              </Label>
              <select
                id="channel"
                name="channel"
                required
                defaultValue="meta"
                className="mt-1 w-full h-9 px-2 rounded-md border border-slate-200 bg-white text-sm"
              >
                <option value="meta">Meta (페북·인스타)</option>
                <option value="google">Google Ads</option>
                <option value="naver">네이버</option>
                <option value="kakao_moment">카카오 모먼트</option>
                <option value="instagram">인스타 organic</option>
                <option value="opentalk">오픈채팅</option>
                <option value="manual">수동 (기타)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="campaign" className="text-xs">
                캠페인 (utm)
              </Label>
              <Input
                id="campaign"
                name="campaign"
                placeholder="강남카페"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="amount" className="text-xs">
                금액 (원)
              </Label>
              <Input
                id="amount"
                name="amount"
                inputMode="numeric"
                placeholder="500000"
                required
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full bg-boopick-navy hover:bg-boopick-navy/90 text-white"
              >
                저장
              </Button>
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <Label htmlFor="notes" className="text-xs">
                비고 (선택)
              </Label>
              <Input
                id="notes"
                name="notes"
                placeholder="가로수길 카페 자리 노출, CTR 1.2%"
                className="mt-1"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-boopick-navy">
              최근 광고비
            </h2>
            <p className="text-sm text-slate-500">
              합계: <strong className="text-boopick-navy">{total.toLocaleString()}원</strong>
            </p>
          </div>
          {spends.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">
              입력된 광고비가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 pr-3">일자</th>
                    <th className="text-left py-2 pr-3">채널</th>
                    <th className="text-left py-2 pr-3">캠페인</th>
                    <th className="text-right py-2 pr-3">금액</th>
                    <th className="text-left py-2">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {spends.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-slate-100 last:border-none"
                    >
                      <td className="py-2 pr-3 text-slate-700">{s.date}</td>
                      <td className="py-2 pr-3 font-semibold text-boopick-navy">
                        {s.channel}
                      </td>
                      <td className="py-2 pr-3 text-slate-600">
                        {s.campaign ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold">
                        {s.amount.toLocaleString()}원
                      </td>
                      <td className="py-2 text-slate-500 truncate max-w-xs">
                        {s.notes ?? ""}
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
