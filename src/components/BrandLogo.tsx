import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/branding";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Custom wordmark logo for ResuVibe.
 * The "Resu" portion is in foreground, "Vibe" is in primary (amber/gold)
 * with a subtle underline accent.
 */
export default function BrandLogo({ className, size = "md" }: BrandLogoProps) {
  const sizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
  };

  return (
    <span
      className={cn(
        "font-heading font-bold tracking-tight inline-flex items-baseline gap-0",
        sizeClasses[size],
        className
      )}
    >
      <span className="text-foreground">Resu</span>
      <span className="relative text-primary">
        Vibe
        <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-primary/60" />
      </span>
    </span>
  );
}
