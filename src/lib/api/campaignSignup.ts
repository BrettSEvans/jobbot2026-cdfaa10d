import { supabase } from "@/integrations/supabase/client";

/**
 * Calls the confirm-campaign-signup edge function to auto-confirm
 * a campaign user's email (bypassing email verification).
 */
export async function confirmCampaignSignup(
  userId: string,
  utmCampaign: string
): Promise<{ confirmed: boolean; reason?: string }> {
  const { data, error } = await supabase.functions.invoke(
    "confirm-campaign-signup",
    { body: { user_id: userId, utm_campaign: utmCampaign } }
  );

  if (error) {
    console.error("confirmCampaignSignup error:", error);
    return { confirmed: false, reason: "invoke_failed" };
  }

  return data as { confirmed: boolean; reason?: string };
}
