export type SubscriptionTier = "free" | "pro" | "premium";

export interface TierConfig {
  tier: SubscriptionTier;
  label: string;
  price: number; // monthly USD, 0 = free trial
  description: string;
  limits: {
    appsPerMonth: number; // -1 = unlimited
    allowedAssets: string[]; // asset type slugs allowed
    canRefine: boolean;
    portfolioItemsPerApp: number; // -1 = unlimited
  };
  features: string[];
  cta: string;
  highlighted?: boolean;
  trialDays?: number; // only for free trial tier
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  free: {
    tier: "free",
    label: "Free Trial",
    price: 0,
    description: "Try everything for 7 days",
    limits: {
      appsPerMonth: 5,
      allowedAssets: ["resume", "cover_letter"],
      canRefine: false,
      portfolioItemsPerApp: 2,
    },
    features: [
      "7-day free trial",
      "5 resumes",
      "2 portfolio items per resume",
      "ATS score analysis",
    ],
    cta: "Start Free Trial",
    trialDays: 7,
  },
  pro: {
    tier: "pro",
    label: "Pro",
    price: 19,
    description: "For serious job seekers",
    limits: {
      appsPerMonth: 20,
      allowedAssets: [
        "resume",
        "cover_letter",
        "executive_report",
        "raid_log",
        "roadmap",
        "architecture_diagram",
      ],
      canRefine: true,
      portfolioItemsPerApp: -1,
    },
    features: [
      "Everything in Trial +",
      "20 applications per month",
      "Executive reports & roadmaps",
      "AI refinement chat",
      "DOCX export",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  premium: {
    tier: "premium",
    label: "Premium",
    price: 39,
    description: "Unlimited power for your career",
    limits: {
      appsPerMonth: -1,
      allowedAssets: [
        "resume",
        "cover_letter",
        "dashboard",
        "executive_report",
        "raid_log",
        "roadmap",
        "architecture_diagram",
        "dynamic",
      ],
      canRefine: true,
      portfolioItemsPerApp: -1,
    },
    features: [
      "Everything in Pro +",
      "Unlimited applications",
      "Interactive dashboards",
      "Custom AI assets",
    ],
    cta: "Go Premium",
  },
};

/** Check if an asset type is allowed for a given tier */
export function isAssetAllowed(tier: SubscriptionTier, assetType: string): boolean {
  const config = TIER_CONFIGS[tier];
  // "dynamic" assets are only for premium
  if (assetType === "dynamic" && tier !== "premium") return false;
  return config.limits.allowedAssets.includes(assetType);
}

/** Check if user can refine assets */
export function canRefine(tier: SubscriptionTier): boolean {
  return TIER_CONFIGS[tier].limits.canRefine;
}

/** Get monthly app limit (-1 = unlimited) */
export function getAppLimit(tier: SubscriptionTier): number {
  return TIER_CONFIGS[tier].limits.appsPerMonth;
}

/** Get portfolio items per app limit (-1 = unlimited) */
export function getPortfolioLimit(tier: SubscriptionTier): number {
  return TIER_CONFIGS[tier].limits.portfolioItemsPerApp;
}

/** Check if a free trial has expired based on period end date */
export function isTrialExpired(periodEnd: string | null): boolean {
  if (!periodEnd) return false;
  return new Date(periodEnd) < new Date();
}
