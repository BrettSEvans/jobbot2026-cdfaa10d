import { useSubscription } from "@/hooks/useSubscription";
import { useAppUsage } from "@/hooks/useAppUsage";

export default function ProUsageBar() {
  const { tier, appLimit, isTrialExpired, trialDaysRemaining } = useSubscription();
  const { data: appsUsed = 0 } = useAppUsage();

  // Show for pro users and active free trial users
  if (tier === "premium") return null;
  if (tier === "free" && isTrialExpired) return null;
  if (appLimit <= 0) return null;

  const ratio = Math.min(appsUsed / appLimit, 1);
  // Interpolate from primary (teal ~168 64% 36%) to destructive (red 0 72% 51%)
  const hue = 168 - ratio * 168;
  const sat = 64 + ratio * (72 - 64);
  const light = 36 + ratio * (51 - 36);

  return (
    <div className="max-w-md">
      {tier === "free" && (
        <p className="text-xs text-muted-foreground mb-2">
          {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""} left in your free trial
        </p>
      )}
      <div className="flex justify-between text-sm text-muted-foreground mb-1">
        <span>Applications this month</span>
        <span>
          {appsUsed} / {appLimit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${ratio * 100}%`,
            backgroundColor: `hsl(${hue}, ${sat}%, ${light}%)`,
          }}
        />
      </div>
    </div>
  );
}
