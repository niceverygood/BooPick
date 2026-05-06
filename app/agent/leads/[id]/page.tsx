import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAgencyId } from "@/lib/agent/demo-agency";
import { StatusForm } from "./status-form";

export const dynamic = "force-dynamic";

interface InquiryDetail {
  id: string;
  message: string | null;
  status: string;
  notify_status: string;
  notified_at: string | null;
  created_at: string;
  contacted_at: string | null;
  met_at: string | null;
  contracted_at: string | null;
  contract_amount: number | null;
  contract_type: string | null;
  closed_reason: string | null;
  tenant_id: string;
  listing_id: string;
  agency_id: string;
  tenant: { phone: string | null; name: string | null; email: string | null } | null;
  listing: {
    address: string | null;
    short_description: string | null;
    description: string | null;
    dong: string | null;
    area_pyeong: number | null;
    floor: number | null;
    building_type: string | null;
    transaction_type: string | null;
    deposit: number | null;
    monthly_rent: number | null;
  } | null;
}

async function fetchInquiry(
  id: string,
  agencyId: string
): Promise<InquiryDetail | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_inquiries")
    .select(
      `id, message, status, notify_status, notified_at, created_at,
       contacted_at, met_at, contracted_at, contract_amount, contract_type, closed_reason,
       tenant_id, listing_id, agency_id,
       tenant:tenants(phone, name, email),
       listing:listings(address, short_description, description, dong, area_pyeong,
                        floor, building_type, transaction_type, deposit, monthly_rent)`
    )
    .eq("id", id)
    .eq("agency_id", agencyId)
    .maybeSingle();

  return (data as unknown as InquiryDetail | null) ?? null;
}

export default async function LeadDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) notFound();

  const inq = await fetchInquiry(params.id, agencyId);
  if (!inq) notFound();

  // PII 정책: 'contacted' 이상으로 status가 진행됐을 때만 전화번호 unmask
  const piiUnlocked = ["contacted", "met", "contracted"].includes(inq.status);
  const displayPhone = inq.tenant?.phone
    ? piiUnlocked
      ? inq.tenant.phone
      : maskPhone(inq.tenant.phone)
    : "(전화 미입력)";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/agent/leads"
        className="text-sm text-slate-500 hover:text-boopick-navy inline-flex items-center gap-1"
      >
        ← 임차인 목록
      </Link>

      {/* 임차인 정보 + status form */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                임차인 컨택
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-boopick-navy mt-1">
                {inq.tenant?.name ?? "임차인"} 님의 문의
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                {new Date(inq.created_at).toLocaleString("ko-KR")}
              </p>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="연락처"
              value={displayPhone}
              hint={
                !piiUnlocked && inq.tenant?.phone
                  ? "'연락 시작' 상태로 변경하면 전체 번호 표시"
                  : undefined
              }
            />
            <Field
              label="알림 상태"
              value={
                inq.notify_status === "sent"
                  ? `발송 완료 (${
                      inq.notified_at
                        ? new Date(inq.notified_at).toLocaleString("ko-KR")
                        : ""
                    })`
                  : inq.notify_status
              }
            />
          </div>

          {inq.message && (
            <div className="mt-5">
              <p className="text-xs text-slate-500 mb-1.5">전달 메시지</p>
              <p className="text-sm text-slate-700 bg-slate-50 px-4 py-3 rounded-md italic whitespace-pre-wrap">
                {inq.message}
              </p>
            </div>
          )}

          <Separator className="my-6" />

          <StatusForm inquiry={inq} />
        </CardContent>
      </Card>

      {/* 매물 정보 */}
      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <h2 className="text-base font-bold text-boopick-navy">관련 매물</h2>
            <Link
              href={`/find/${inq.listing_id}`}
              className="text-xs text-boopick-orange hover:text-boopick-orange/80"
            >
              임차인 화면 보기 →
            </Link>
          </div>
          <p className="text-base font-semibold text-boopick-navy">
            {inq.listing?.short_description ?? inq.listing?.address}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {[
              inq.listing?.dong,
              inq.listing?.building_type,
              inq.listing?.area_pyeong
                ? `${inq.listing.area_pyeong}평`
                : null,
              inq.listing?.floor != null
                ? `${inq.listing.floor}층`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-sm font-semibold text-slate-800 mt-3">
            {priceLabel(inq.listing)}
          </p>
          {inq.listing?.description && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-xs text-slate-500 hover:text-boopick-navy">
                매물 상세 설명 펼치기
              </summary>
              <p className="mt-2 text-slate-700 whitespace-pre-wrap leading-relaxed">
                {inq.listing.description}
              </p>
            </details>
          )}
        </CardContent>
      </Card>

      {/* 거래 정보 (contracted일 때만) */}
      {inq.status === "contracted" && (
        <Card className="border-boopick-green bg-emerald-50/50">
          <CardContent className="p-5">
            <p className="text-sm font-bold text-boopick-green mb-2">
              ✅ 거래 완료
            </p>
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-slate-500">거래 유형:</span>{" "}
                <strong>{inq.contract_type ?? "—"}</strong>
              </div>
              <div>
                <span className="text-slate-500">거래 금액:</span>{" "}
                <strong>
                  {inq.contract_amount
                    ? `${(inq.contract_amount / 10000).toLocaleString()}만원`
                    : "—"}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">완료 시각:</span>{" "}
                <strong>
                  {inq.contracted_at
                    ? new Date(inq.contracted_at).toLocaleString("ko-KR")
                    : "—"}
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-boopick-navy mt-1">{value}</p>
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function priceLabel(l: InquiryDetail["listing"]): string {
  if (!l) return "—";
  const parts: string[] = [];
  if (l.transaction_type) parts.push(l.transaction_type);
  if (l.deposit) parts.push(`보증금 ${formatKRW(l.deposit)}`);
  if (l.monthly_rent && l.monthly_rent > 0)
    parts.push(`월세 ${formatKRW(l.monthly_rent)}`);
  return parts.join(" · ") || "협의";
}

function formatKRW(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return eok % 1 === 0 ? `${eok}억` : `${eok.toFixed(1)}억`;
  }
  if (n >= 10_000) {
    return `${Math.round(n / 10_000).toLocaleString()}만`;
  }
  return n.toLocaleString();
}

function maskPhone(phone: string): string {
  const d = phone.replace(/[^\d]/g, "");
  if (d.length < 8) return "****";
  return d.slice(0, 3) + "-****-" + d.slice(-4);
}
