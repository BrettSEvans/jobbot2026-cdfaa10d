interface BrandLogoProps {
  showWordmark?: boolean;
  className?: string;
  iconSize?: string;
}

export default function BrandLogo({ showWordmark = true, className = "", iconSize = "2.4em" }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* RV Monogram */}
      <svg
        viewBox="0 0 64 64"
        style={{ height: iconSize, width: iconSize }}
        className="shrink-0"
        aria-label="ResuVibe logo"
      >
        <rect width="64" height="64" rx="14" fill="hsl(234 35% 18%)" />
        <text
          x="14"
          y="46"
          fontFamily="'DM Serif Display', serif"
          fontSize="36"
          fontWeight="400"
          fill="white"
        >
          R
        </text>
        <text
          x="34"
          y="46"
          fontFamily="'DM Serif Display', serif"
          fontSize="36"
          fontWeight="400"
          fill="hsl(36 90% 50%)"
        >
          V
        </text>
      </svg>

      {showWordmark && (
        <span className="font-heading text-xl tracking-tight select-none">
          <span className="text-foreground">Resu</span>
          <span className="text-primary">Vibe</span>
        </span>
      )}
    </div>
  );
}
