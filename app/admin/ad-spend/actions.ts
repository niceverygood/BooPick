"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

export async function addAdSpend(formData: FormData): Promise<void> {
  const date = String(formData.get("date") ?? "").trim();
  const channel = String(formData.get("channel") ?? "").trim();
  const campaign = String(formData.get("campaign") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").replace(/[^\d]/g, "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!date || !channel || !amountRaw) return;

  const amount = parseInt(amountRaw, 10);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const admin = createAdminClient();
  await admin.from("ad_spends").insert({
    date,
    channel,
    campaign: campaign || null,
    amount,
    notes: notes || null,
  });

  revalidatePath("/admin/ad-spend");
  revalidatePath("/admin/funnel");
}
