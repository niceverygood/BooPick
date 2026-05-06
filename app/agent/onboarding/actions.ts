"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/agent";

export async function completeOnboarding(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/agent/login");

  const agencyName = String(formData.get("agency_name") ?? "").trim();
  const businessNo = String(formData.get("business_registration_number") ?? "").trim();
  const phone = String(formData.get("agent_phone") ?? "").trim();
  const channelUrl = String(formData.get("kakao_channel_url") ?? "").trim();
  const notifyConsent = formData.get("notification_consent") === "on";

  if (!agencyName || !phone) return; // 필수 누락 — 클라이언트에서 검증 별도

  const admin = createAdminClient();
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  await admin
    .from("agencies")
    .update({
      name: agencyName,
      business_registration_number: businessNo || null,
      agent_phone: phone,
      kakao_channel_url: channelUrl || null,
      notification_consent: notifyConsent,
      trial_plan_id: "pro",
      trial_ends_at: trialEnds.toISOString(),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.agency_id);

  revalidatePath("/agent");
  redirect("/agent");
}
