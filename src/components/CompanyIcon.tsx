import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CompanyIconProps {
  companyName?: string | null;
  companyUrl?: string | null;
  iconUrl?: string | null;
  size?: "sm" | "md";
}

function getInitials(name: string): string {
  return name
    .split(/[\s&,]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function extractRootDomain(hostname: string): string {
  // Strip www and common subdomains, keep root domain
  const parts = hostname.replace(/^www\./, "").split(".");
  // For domains like get.chownow.com → chownow.com
  if (parts.length > 2) {
    return parts.slice(-2).join(".");
  }
  return parts.join(".");
}

function getClearbitUrl(companyUrl?: string | null, companyName?: string | null): string | null {
  // Try extracting domain from company URL
  if (companyUrl) {
    try {
      const url = new URL(companyUrl.startsWith("http") ? companyUrl : `https://${companyUrl}`);
      const rootDomain = extractRootDomain(url.hostname);
      return `https://logo.clearbit.com/${rootDomain}`;
    } catch {
      // fall through
    }
  }
  // Try guessing domain from company name
  if (companyName) {
    const slug = companyName
      .toLowerCase()
      .replace(/\s*\(.*?\)\s*/g, "") // strip parenthetical like "(Propeller Consulting)"
      .replace(/[^a-z0-9]/g, "")
      .trim();
    if (slug) return `https://logo.clearbit.com/${slug}.com`;
  }
  return null;
}

// Generate a deterministic HSL color from a string
function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function CompanyIcon({ companyName, companyUrl, iconUrl, size = "sm" }: CompanyIconProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const name = companyName || "?";
  const initials = getInitials(name);
  const bgColor = stringToColor(name);

  // Priority: saved icon URL → Clearbit → fallback
  const imageUrl = !imgFailed
    ? iconUrl || getClearbitUrl(companyUrl, companyName)
    : null;

  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <Avatar className={`${dim} shrink-0 rounded-md`}>
      {imageUrl && (
        <AvatarImage
          src={imageUrl}
          alt={name}
          onError={() => setImgFailed(true)}
          className="rounded-md object-contain p-0.5"
        />
      )}
      <AvatarFallback
        className="rounded-md text-white font-semibold"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
