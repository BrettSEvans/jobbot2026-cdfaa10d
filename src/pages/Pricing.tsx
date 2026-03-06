import { Check, Sparkles, Zap, Crown } from "lucide-react";
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

  const handleUpgrade = async (newTier: SubscriptionTier) => {
    if (newTier === currentTier) return;

    // Mock: in production this would redirect to Stripe checkout
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

  const tiers = Object.values(TIER_CONFIGS);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Supercharge your job search with AI-generated assets tailored to every
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
          const isDowngrade =
            tiers.indexOf(config) <
            tiers.findIndex((t) => t.tier === currentTier);
          const shouldHighlight = isCurrent || (currentTier === "free" && config.highlighted);

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

              <CardFooter>
                <Button
                  className="w-full"
                  variant={config.highlighted ? "default" : "outline"}
                  disabled={isCurrent || isDowngrade || isUpgrading}
                  onClick={() => handleUpgrade(config.tier)}
                >
                  {isCurrent
                    ? "Current Plan"
                    : isDowngrade
                    ? "Downgrade"
                    : config.cta}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-8">
        🔒 Mock checkout — no real payment will be processed. Connect Stripe to
        enable live billing.
      </p>
    </div>
  );
}
