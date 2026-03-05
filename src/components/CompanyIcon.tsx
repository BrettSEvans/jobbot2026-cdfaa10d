import { useState } from "react";

interface CompanyIconProps {
  iconUrl?: string | null;
  companyName?: string | null;
  /** Icon size in pixels */
  size?: number;
  className?: string;
}

/**
 * Displays a company icon with letter-avatar fallback.
 * If iconUrl is provided, renders an <img>. On load error, falls back to letter-avatar.
 * If no iconUrl, renders the letter-avatar directly.
 */
export default function CompanyIcon({ iconUrl, companyName, size = 20, className = "" }: CompanyIconProps) {
  const [imgError, setImgError] = useState(false);

  const letter = (companyName || "?").charAt(0).toUpperCase();

  if (iconUrl && !imgError) {
    return (
      <img
        src={iconUrl}
        alt={`${companyName || "Company"} logo`}
        width={size}
        height={size}
        className={`rounded object-contain flex-shrink-0 ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`rounded bg-muted flex items-center justify-center text-muted-foreground font-semibold flex-shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
}
