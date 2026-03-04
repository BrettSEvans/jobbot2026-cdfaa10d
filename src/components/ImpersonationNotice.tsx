import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Info } from "lucide-react";

/**
 * Shows a contextual notice when the admin is impersonating a test user.
 * Drop this into any page to inform the admin about the active persona.
 */
export default function ImpersonationNotice() {
  const { activePersona, isImpersonating } = useImpersonation();

  if (!isImpersonating || !activePersona) return null;

  const name = [activePersona.first_name, activePersona.last_name].filter(Boolean).join(" ") || "Test User";

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-3 text-sm">
      <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div>
        <p className="font-medium text-foreground">
          Viewing as <span className="text-primary">{name}</span>
        </p>
        <p className="text-muted-foreground text-xs mt-0.5">
          Applications belong to your admin account. AI generations will use {name}'s profile data for personalization.
        </p>
      </div>
    </div>
  );
}
