import { useState } from "react";
import { Check, Sparkles, Zap, Crown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSubscription } from "@/hooks/useSubscription";
import { useAppUsage } from "@/hooks/useAppUsage";
import { TIER_CONFIGS, type SubscriptionTier } from "@/lib/subscriptionTiers";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  free: <Zap className="h-6 w-6" />,
  pro: <Sparkles className="h-6 w-6" />,
  premium: <Crown className="h-6 w-6" />,
};

export default function Pricing() {
  const { tier: currentTier, upgrade, isUpgrading } = useSubscription();
  const { data: appsUsed = 0 } = useAppUsage();
  const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null);

  const tiers = Object.values(TIER_CONFIGS);

  const handleChangePlan = async (newTier: SubscriptionTier) => {
    if (newTier === currentTier) return;

    const currentIndex = tiers.findIndex((t) => t.tier === currentTier);
    const newIndex = tiers.findIndex((t) => t.tier === newTier);
    const isDowngrade = newIndex < currentIndex;

    if (isDowngrade) {
      setPendingTier(newTier);
      return;
    }

    // Upgrade — proceed directly
    try {
      await upgrade(newTier);
      toast({
        title: "Plan updated!",
        description: `You're now on the ${TIER_CONFIGS[newTier].label} plan. (Mock — no payment processed)`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update plan. Please try again.",
        variant: "destructive",
      });
    }
  };

  const confirmDowngrade = async () => {
    if (!pendingTier) return;
    try {
      await upgrade(pendingTier);
      toast({
        title: pendingTier === "free" ? "Plan cancelled" : "Plan downgraded",
        description:
          pendingTier === "free"
            ? "You're now on the Free plan."
            : `You're now on the ${TIER_CONFIGS[pendingTier].label} plan.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to change plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPendingTier(null);
    }
  };

  // Features the user will lose when downgrading
  const lostFeatures =
    pendingTier != null
      ? TIER_CONFIGS[currentTier].features.filter(
          (f) => !TIER_CONFIGS[pendingTier].features.includes(f)
        )
      : [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
          Membership
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Supercharge your job search with AI-generated materials tailored to every
          application.
        </p>
        {currentTier !== "free" && (
          <Badge variant="outline" className="mt-3">
            Current plan: {TIER_CONFIGS[currentTier].label}
          </Badge>
        )}
      </div>

      {/* Usage bar for free users */}
      {currentTier === "free" && (
        <div className="mb-8 max-w-md mx-auto">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>Applications this month</span>
            <span>{appsUsed} / 2</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min((appsUsed / 2) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {currentTier !== "free" && (
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
            <Sparkles className="h-4 w-4" />
            <span>
              Congrats! You're on the <strong>{TIER_CONFIGS[currentTier].label}</strong> plan 🎉
            </span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((config) => {
          const isCurrent = config.tier === currentTier;
          const currentIndex = tiers.findIndex((t) => t.tier === currentTier);
          const configIndex = tiers.indexOf(config);
          const isDowngrade = configIndex < currentIndex;
          const isUpgrade = configIndex > currentIndex;
          const shouldHighlight = isCurrent || (currentTier === "free" && config.highlighted);

          const buttonLabel = isCurrent
            ? "Current Plan"
            : isDowngrade
            ? `Switch to ${config.label}`
            : config.cta;

          // Upgrade buttons always use primary amber color for better conversion
          const buttonVariant = isCurrent
            ? "outline"
            : isDowngrade
            ? "ghost"
            : "default";

          return (
            <Card
              key={config.tier}
              className={cn(
                "relative flex flex-col",
                shouldHighlight &&
                  "border-primary shadow-md ring-1 ring-primary/20"
              )}
            >
              {isCurrent && currentTier !== "free" ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-sm">
                    Your Plan
                  </Badge>
                </div>
              ) : config.highlighted && currentTier === "free" ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-sm">
                    Most Popular
                  </Badge>
                </div>
              ) : null}
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2 text-primary mb-1">
                  {TIER_ICONS[config.tier]}
                  <CardTitle className="text-xl">{config.label}</CardTitle>
                </div>
                <CardDescription>{config.description}</CardDescription>
                <div className="mt-3">
                  <span className="text-3xl font-heading font-bold text-foreground">
                    {config.price === 0 ? "Free" : `$${config.price}`}
                  </span>
                  {config.price > 0 && (
                    <span className="text-muted-foreground text-sm">/mo</span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2.5">
                  {config.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex-col gap-2">
                <Button
                  className={cn("w-full", isDowngrade && "text-muted-foreground")}
                  variant={buttonVariant as "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"}
                  disabled={isCurrent || isUpgrading}
                  onClick={() => handleChangePlan(config.tier)}
                >
                  {buttonLabel}
                </Button>
                {isCurrent && currentTier === "premium" && (
                  <p className="text-xs text-muted-foreground text-center">You have access to everything ✨</p>
                )}
                {isCurrent && currentTier === "pro" && (
                  <p className="text-xs text-muted-foreground text-center">Powering your job search 🚀</p>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        🔒 Mock checkout — no real payment will be processed. Connect Stripe to
        enable live billing.
      </p>

      {/* Downgrade / Cancel confirmation dialog */}
      <AlertDialog open={!!pendingTier} onOpenChange={(open) => !open && setPendingTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {pendingTier === "free" ? "Cancel your plan?" : "Downgrade your plan?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {pendingTier === "free"
                    ? "You'll lose access to all paid features and return to the Free plan."
                    : `You'll be moving from ${TIER_CONFIGS[currentTier].label} to ${TIER_CONFIGS[pendingTier!]?.label}.`}
                </p>
                {lostFeatures.length > 0 && (
                  <div>
                    <p className="font-medium text-foreground text-sm mb-1">
                      You'll lose access to:
                    </p>
                    <ul className="space-y-1">
                      {lostFeatures.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-destructive">
                          <span className="mt-0.5">✕</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="text-muted-foreground"
              onClick={confirmDowngrade}
              disabled={isUpgrading}
            >
              {pendingTier === "free" ? "Switch to Free" : `Switch to ${TIER_CONFIGS[pendingTier!]?.label}`}
            </AlertDialogCancel>
            <AlertDialogAction>
              Keep current plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}