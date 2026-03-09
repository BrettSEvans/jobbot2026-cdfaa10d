import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/branding";
import logoImg from "@/assets/resuvibe-logo.png";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * Custom wordmark logo for ResuVibe.
 * Logo mark + "Resu" in foreground + "Vibe" in primary (amber/gold).
 */
export default function BrandLogo({ className, size = "md" }: BrandLogoProps) {
  const sizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-3xl",
  };

  const imgSize = {
    sm: "h-[3em] w-[3em]",
    md: "h-[3em] w-[3em]",
    lg: "h-[3em] w-[3em]",
  };

  return (
    <span
      className={cn(
        "font-heading font-bold tracking-tight inline-flex items-center gap-1.5",
        sizeClasses[size],
        className
      )}
    >
      <img src={logoImg} alt="ResuVibe logo" className={cn(imgSize[size], "object-contain")} />
      <span className="text-foreground">Resu</span>
      <span className="relative text-primary" style={{ marginLeft: "-0.15em" }}>
        Vibe
        <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-primary/60" />
      </span>
    </span>
  );
}
