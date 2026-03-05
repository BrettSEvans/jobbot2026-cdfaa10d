import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  type SubscriptionTier,
  TIER_CONFIGS,
  isAssetAllowed,
  canRefine,
  getAppLimit,
} from "@/lib/subscriptionTiers";

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: string;
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async (): Promise<UserSubscription> => {
      const { data, error } = await supabase
        .from("user_subscriptions" as any)
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error) {
        // If no subscription exists, create a free one
        if (error.code === "PGRST116") {
          const { data: newSub, error: insertError } = await supabase
            .from("user_subscriptions" as any)
            .insert({ user_id: user!.id, tier: "free", status: "active" })
            .select()
            .single();
          if (insertError) throw insertError;
          return newSub as unknown as UserSubscription;
        }
        throw error;
      }
      return data as unknown as UserSubscription;
    },
    enabled: !!user,
  });

  // Mock upgrade — in production this would redirect to Stripe checkout
  const upgradeMutation = useMutation({
    mutationFn: async (newTier: SubscriptionTier) => {
      const { error } = await supabase
        .from("user_subscriptions" as any)
        .update({
          tier: newTier,
          status: "active",
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });

  const tier: SubscriptionTier = (subscription?.tier as SubscriptionTier) ?? "free";
  const tierConfig = TIER_CONFIGS[tier];

  return {
    subscription,
    isLoading,
    tier,
    tierConfig,
    isAssetAllowed: (assetType: string) => isAssetAllowed(tier, assetType),
    canRefine: canRefine(tier),
    appLimit: getAppLimit(tier),
    upgrade: upgradeMutation.mutateAsync,
    isUpgrading: upgradeMutation.isPending,
  };
}
