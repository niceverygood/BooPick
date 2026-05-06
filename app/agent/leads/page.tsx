import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAgencyId } from "@/lib/agent/demo-agency";

export const dynamic = "force-dynamic";

interface InquiryRow {
  id: string;
  message: string | null;
  status: string;
  notify_status: string;
  notified_at: string | null;
  created_at: string;
  contacted_at: string | null;
  tenant_id: string;
  listing_id: string;
  tenant: { phone: string | null; name: string | null } | null;
  listing: {
    address: string | null;
    short_description: string | null;
    dong: string | null;
    area_pyeong: number | null;
  } | null;
}

async function fetchLeads(agencyId: string): Promise<InquiryRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenant_inquiries")
    .select(
      `id, message, status, notify_status, notified_at, created_at, contacted_at,
       tenant_id, listing_id,
       tenant:tenants(phone, name),
       listing:listings(address, short_description, dong, area_pyeong)`
    )
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as unknown as InquiryRow[];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending: {
    label: "신규",
    cls: "bg-boopick-orange text-white border-none",
  },
  contacted: {
    label: "연락 시작",
    cls: "bg-blue-500 text-white border-none",
  },
  met: {
    label: "현장 미팅",
    cls: "bg-violet-500 text-white border-none",
  },
  contracted: {
    label: "거래 완료",
    cls: "bg-boopick-green text-white border-none",
  },
  closed: {
    label: "종료",
    cls: "bg-slate-400 text-white border-none",
  },
  cancelled: {
    label: "취소",
    cls: "bg-slate-300 text-slate-700 border-none",
  },
};

export default async function LeadsPage() {
  const agencyId = await getCurrentAgencyId();
  if (!agencyId) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-sm text-slate-500">중개사 정보가 없습니다.</p>
      </div>
    );
  }

  const leads = await fetchLeads(agencyId);

  const counts = {
    pending: leads.filter((l) => l.status === "pending").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    contracted: leads.filter((l) => l.status === "contracted").length,
    total: leads.length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-boopick-navy">
          임차인 inbox
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          본인 매물에 들어온 임차인 컨택을 관리합니다.
        </p>
      </div>

      {/* 카운트 요약 */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <CountTile label="신규" value={counts.pending} accent />
        <CountTile label="연락 중" value={counts.contacted} />
        <CountTile label="거래 완료" value={counts.contracted} />
        <CountTile label="전체" value={counts.total} />
      </div>

      {/* leads 목록 */}
      {leads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-base font-semibold text-boopick-navy mb-2">
              아직 들어온 임차인이 없습니다
            </p>
            <p className="text-sm text-slate-500 mb-5">
              본인 매물이 임차인 검색 결과에 노출되어야 컨택이 들어옵니다.
              <br />
              <Link
                href="/agent/listings"
                className="text-boopick-orange underline underline-offset-2"
              >
                매물 등록하기
              </Link>
              {" · "}
              <Link
                href="/"
                className="text-boopick-orange underline underline-offset-2"
              >
                임차인 화면 미리보기
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}

function CountTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p
          className={`text-xs uppercase tracking-wider ${
            accent ? "text-boopick-orange" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        <p className="text-2xl font-bold text-boopick-navy mt-1.5">{value}</p>
      </CardContent>
    </Card>
  );
}

function LeadCard({ lead }: { lead: InquiryRow }) {
  const statusInfo = STATUS_LABEL[lead.status] ?? STATUS_LABEL.pending;
  const tenantPhone = lead.tenant?.phone;
  const masked = tenantPhone ? maskPhone(tenantPhone) : "(전화 미입력)";

  const elapsed = elapsedSince(lead.created_at);

  return (
    <Link
      href={`/agent/leads/${lead.id}`}
      className="block group focus:outline-none focus:ring-2 focus:ring-boopick-orange rounded-lg"
    >
      <Card className="transition-all group-hover:shadow-md group-hover:border-boopick-orange/30">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge className={statusInfo.cls}>{statusInfo.label}</Badge>
                <span className="text-xs text-slate-400">{elapsed}</span>
              </div>
              <h3 className="font-bold text-base text-boopick-navy line-clamp-1">
                {lead.listing?.short_description ?? lead.listing?.address ?? "매물"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {[
                  lead.listing?.dong,
                  lead.listing?.area_pyeong
                    ? `${lead.listing.area_pyeong}평`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {lead.message && (
                <p className="mt-2 text-sm text-slate-700 line-clamp-2 bg-slate-50 px-3 py-2 rounded-md italic">
                  &ldquo;{lead.message}&rdquo;
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                📞 {masked}
              </p>
            </div>
            <div className="text-xs text-slate-400 group-hover:text-boopick-orange transition-colors shrink-0">
              상세 →
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function maskPhone(phone: string): string {
  const d = phone.replace(/[^\d]/g, "");
  if (d.length < 8) return "****";
  return d.slice(0, 3) + "-****-" + d.slice(-4);
}

function elapsedSince(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}
