export type SubscriptionTier = "free" | "pro" | "premium";

export interface TierConfig {
  tier: SubscriptionTier;
  label: string;
  price: number; // monthly USD, 0 = free
  description: string;
  limits: {
    appsPerMonth: number; // -1 = unlimited
    allowedAssets: string[]; // asset type slugs allowed
    canRefine: boolean;
  };
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export const TIER_CONFIGS: Record<SubscriptionTier, TierConfig> = {
  free: {
    tier: "free",
    label: "Free",
    price: 0,
    description: "Get started with the basics",
    limits: {
      appsPerMonth: 2,
      allowedAssets: ["resume", "cover_letter"],
      canRefine: false,
    },
    features: [
      "2 applications per month",
      "Resume & cover letter",
      "ATS score analysis",
    ],
    cta: "Current Plan",
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
    },
    features: [
      "Everything in Free +",
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
