"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentAgencyId } from "@/lib/agent/demo-agency";

type AllowedStatus =
  | "pending"
  | "contacted"
  | "met"
  | "contracted"
  | "closed"
  | "cancelled";

const ALLOWED: AllowedStatus[] = [
  "pending",
  "contacted",
  "met",
  "contracted",
  "closed",
  "cancelled",
];

export async function updateInquiryStatus(formData: FormData) {
  const id = formData.get("inquiry_id");
  const status = formData.get("status");
  const amountRaw = formData.get("contract_amount");
  const contractType = formData.get("contract_type");
  const closedReason = formData.get("closed_reason");

  if (typeof id !== "string" || typeof status !== "string") {
    return { ok: false, error: "필수 필드 누락" };
  }
  if (!ALLOWED.includes(status as AllowedStatus)) {
    return { ok: false, error: "허용되지 않은 status" };
  }

  const agencyId = await getCurrentAgencyId();
  if (!agencyId) return { ok: false, error: "agency 정보 없음" };

  const admin = createAdminClient();

  // 본인 agency의 inquiry인지 검증 (server action security)
  const { data: existing } = await admin
    .from("tenant_inquiries")
    .select("id, agency_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!existing || existing.agency_id !== agencyId) {
    return { ok: false, error: "권한 없음" };
  }

  const updates: Record<string, unknown> = { status };
  const now = new Date().toISOString();

  if (status === "contacted" && !existing.status.includes("contact")) {
    updates.contacted_at = now;
  }
  if (status === "met") {
    updates.met_at = now;
  }
  if (status === "contracted") {
    updates.contracted_at = now;
    if (typeof amountRaw === "string") {
      const amount = parseInt(amountRaw.replace(/[^\d]/g, ""), 10);
      if (Number.isFinite(amount) && amount > 0) updates.contract_amount = amount;
    }
    if (
      typeof contractType === "string" &&
      ["매매", "전세", "월세"].includes(contractType)
    ) {
      updates.contract_type = contractType;
    }
  }
  if (status === "closed" || status === "cancelled") {
    if (typeof closedReason === "string" && closedReason.trim().length > 0) {
      updates.closed_reason = closedReason.trim().slice(0, 500);
    }
  }

  const { error } = await admin
    .from("tenant_inquiries")
    .update(updates)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/agent/leads/${id}`);
  revalidatePath("/agent/leads");
  revalidatePath("/agent");
  return { ok: true };
}
