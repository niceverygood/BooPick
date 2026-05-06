"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { extractTags } from "@/lib/tagging/extract-tags";
import { createEmbedding } from "@/lib/openai";
import { getCurrentAgencyId } from "@/lib/agent/demo-agency";

type BT = "상가" | "사무실" | "주거" | "토지";
type TT = "매매" | "전세" | "월세" | "단기";

const BUILDING_TYPES: BT[] = ["상가", "사무실", "주거", "토지"];
const TRANSACTION_TYPES: TT[] = ["매매", "전세", "월세", "단기"];

interface CreateInput {
  address: string;
  dong?: string;
  building_name?: string;
  area_pyeong?: number;
  floor?: number;
  total_floors?: number;
  building_type: BT;
  transaction_type: TT;
  deposit?: number;
  monthly_rent?: number;
  premium?: number;
  description: string;
  short_description?: string;
}

function parseFromForm(fd: FormData): CreateInput | { error: string } {
  const address = String(fd.get("address") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim();
  if (!address) return { error: "주소는 필수입니다" };
  if (!description) return { error: "매물 설명은 필수입니다" };

  const buildingType = String(fd.get("building_type") ?? "상가") as BT;
  if (!BUILDING_TYPES.includes(buildingType))
    return { error: "잘못된 매물 유형" };
  const transactionType = String(fd.get("transaction_type") ?? "월세") as TT;
  if (!TRANSACTION_TYPES.includes(transactionType))
    return { error: "잘못된 거래 유형" };

  const out: CreateInput = {
    address,
    description,
    building_type: buildingType,
    transaction_type: transactionType,
  };

  const dongInput = String(fd.get("dong") ?? "").trim();
  out.dong = dongInput || extractDong(address) || undefined;
  out.building_name = String(fd.get("building_name") ?? "").trim() || undefined;
  out.short_description =
    String(fd.get("short_description") ?? "").trim() ||
    description.slice(0, 100);

  const areaPyeong = parseNum(fd.get("area_pyeong"));
  if (areaPyeong != null) out.area_pyeong = areaPyeong;
  const floor = parseNum(fd.get("floor"));
  if (floor != null) out.floor = floor;
  const totalFloors = parseNum(fd.get("total_floors"));
  if (totalFloors != null) out.total_floors = totalFloors;
  const deposit = parseNum(fd.get("deposit"));
  if (deposit != null) out.deposit = deposit;
  const rent = parseNum(fd.get("monthly_rent"));
  if (rent != null) out.monthly_rent = rent;
  const premium = parseNum(fd.get("premium"));
  if (premium != null) out.premium = premium;

  return out;
}

function parseNum(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).replace(/[^\d.\-]/g, "");
  if (s === "" || s === "-") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function extractDong(address: string): string | null {
  const tokens = address.split(/\s+/);
  for (const t of tokens) {
    if (/^[가-힣]+동\d?가?$/.test(t)) return t.replace(/\d+가$/, "");
  }
  const m = address.match(/([가-힣]+동)/);
  return m ? m[1] : null;
}

export async function createListing(formData: FormData) {
  const parsed = parseFromForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const agencyId = await getCurrentAgencyId();
  if (!agencyId) return { ok: false, error: "agency 정보가 없습니다" };

  const admin = createAdminClient();

  // AI 태깅 + 임베딩 (Haiku 사용)
  let tags;
  try {
    tags = await extractTags({
      description: parsed.description,
      shortDescription: parsed.short_description,
      useHaiku: true,
    });
  } catch (e) {
    return {
      ok: false,
      error: `AI 태깅 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  let embedding: number[];
  try {
    const embedText = [
      parsed.dong,
      parsed.short_description ?? "",
      parsed.description,
    ]
      .filter(Boolean)
      .join("\n");
    embedding = await createEmbedding(embedText);
  } catch (e) {
    return {
      ok: false,
      error: `임베딩 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const { data, error } = await admin
    .from("listings")
    .insert({
      agency_id: agencyId,
      address: parsed.address,
      dong: parsed.dong ?? null,
      building_name: parsed.building_name ?? null,
      area_pyeong: parsed.area_pyeong ?? null,
      area_sqm: parsed.area_pyeong ? parsed.area_pyeong * 3.3058 : null,
      floor: parsed.floor ?? null,
      total_floors: parsed.total_floors ?? null,
      building_type: parsed.building_type,
      transaction_type: parsed.transaction_type,
      deposit: parsed.deposit ?? null,
      monthly_rent: parsed.monthly_rent ?? null,
      premium: parsed.premium ?? null,
      description: parsed.description,
      short_description: parsed.short_description,
      photo_urls: [],
      status: "active",
      source: "manual",
      ai_tags: tags.tags,
      ai_embedding: embedding,
      ai_processed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "DB 저장 실패" };
  }

  revalidatePath("/agent/listings");
  revalidatePath("/agent");
  revalidatePath("/");
  redirect(`/agent/listings/${data.id}`);
}

export async function updateListing(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, error: "id 필요" };

  const parsed = parseFromForm(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  const agencyId = await getCurrentAgencyId();
  if (!agencyId) return { ok: false, error: "agency 정보가 없습니다" };

  const admin = createAdminClient();

  // 본인 agency 매물 검증
  const { data: existing } = await admin
    .from("listings")
    .select("id, agency_id, description")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.agency_id !== agencyId) {
    return { ok: false, error: "권한 없음" };
  }

  // 설명이 바뀌었으면 재태깅·재임베딩
  const descChanged = existing.description !== parsed.description;
  const updates: Record<string, unknown> = {
    address: parsed.address,
    dong: parsed.dong ?? null,
    building_name: parsed.building_name ?? null,
    area_pyeong: parsed.area_pyeong ?? null,
    area_sqm: parsed.area_pyeong ? parsed.area_pyeong * 3.3058 : null,
    floor: parsed.floor ?? null,
    total_floors: parsed.total_floors ?? null,
    building_type: parsed.building_type,
    transaction_type: parsed.transaction_type,
    deposit: parsed.deposit ?? null,
    monthly_rent: parsed.monthly_rent ?? null,
    premium: parsed.premium ?? null,
    description: parsed.description,
    short_description: parsed.short_description,
  };

  if (descChanged) {
    try {
      const tags = await extractTags({
        description: parsed.description,
        shortDescription: parsed.short_description,
        useHaiku: true,
      });
      const embedText = [
        parsed.dong,
        parsed.short_description ?? "",
        parsed.description,
      ]
        .filter(Boolean)
        .join("\n");
      const embedding = await createEmbedding(embedText);
      updates.ai_tags = tags.tags;
      updates.ai_embedding = embedding;
      updates.ai_processed_at = new Date().toISOString();
    } catch (e) {
      // AI 실패해도 매물 정보 자체는 업데이트
      console.error("[updateListing] AI 재처리 실패:", e);
    }
  }

  const { error } = await admin
    .from("listings")
    .update(updates)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/agent/listings/${id}`);
  revalidatePath("/agent/listings");
  revalidatePath("/agent");
  return { ok: true };
}

// `<form action={...}>` 직접 사용 — void 반환
export async function archiveListing(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const agencyId = await getCurrentAgencyId();
  if (!agencyId) return;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("listings")
    .select("id, agency_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.agency_id !== agencyId) return;

  await admin
    .from("listings")
    .update({ status: "archived" })
    .eq("id", id);

  revalidatePath("/agent/listings");
  revalidatePath("/agent");
  revalidatePath("/");
  redirect("/agent/listings");
}

export async function toggleTenantPool(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("enabled") === "true";
  if (!id) return;

  const agencyId = await getCurrentAgencyId();
  if (!agencyId) return;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("listings")
    .select("id, agency_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing || existing.agency_id !== agencyId) return;

  await admin
    .from("listings")
    .update({ tenant_pool_enabled: enabled })
    .eq("id", id);

  revalidatePath(`/agent/listings/${id}`);
  revalidatePath("/agent/listings");
}
