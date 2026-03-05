import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface UpgradeGateProps {
  feature: string;
  requiredTier?: "pro" | "premium";
  children: React.ReactNode;
  isLocked: boolean;
}

export default function UpgradeGate({
  feature,
  requiredTier = "pro",
  children,
  isLocked,
}: UpgradeGateProps) {
  const navigate = useNavigate();

  if (!isLocked) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40 select-none blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg border border-border">
        <Lock className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">
          {feature} requires {requiredTier === "premium" ? "Premium" : "Pro"}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Upgrade your plan to unlock this feature
        </p>
        <Button size="sm" onClick={() => navigate("/pricing")}>
          View Plans
        </Button>
      </div>
    </div>
  );
}
