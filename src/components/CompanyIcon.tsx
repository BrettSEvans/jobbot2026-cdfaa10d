import { useState, useMemo } from "react";
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
  const parts = hostname.replace(/^www\./, "").split(".");
  if (parts.length > 2) return parts.slice(-2).join(".");
  return parts.join(".");
}

function getDomainFromUrl(companyUrl?: string | null): string | null {
  if (!companyUrl) return null;
  try {
    const url = new URL(companyUrl.startsWith("http") ? companyUrl : `https://${companyUrl}`);
    return extractRootDomain(url.hostname);
  } catch {
    return null;
  }
}

function getSlugFromName(companyName?: string | null): string | null {
  if (!companyName) return null;
  const slug = companyName
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return slug || null;
}

/** Build an ordered list of logo URLs to try */
function buildFallbackUrls(companyUrl?: string | null, companyName?: string | null): string[] {
  const urls: string[] = [];
  const domain = getDomainFromUrl(companyUrl);
  const slug = getSlugFromName(companyName);
  const guessDomain = slug ? `${slug}.com` : null;

  // Tier 1: Clearbit from actual domain
  if (domain) urls.push(`https://logo.clearbit.com/${domain}`);
  // Tier 2: Google favicon service from actual domain (high-res)
  if (domain) urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
  // Tier 3: Clearbit from guessed domain (company name → .com)
  if (guessDomain && guessDomain !== domain) urls.push(`https://logo.clearbit.com/${guessDomain}`);
  // Tier 4: Google favicon from guessed domain
  if (guessDomain && guessDomain !== domain) urls.push(`https://www.google.com/s2/favicons?domain=${guessDomain}&sz=64`);

  return urls;
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function CompanyIcon({ companyName, companyUrl, iconUrl, size = "sm" }: CompanyIconProps) {
  const [failedIndex, setFailedIndex] = useState(-1);

  const name = companyName || "?";
  const initials = getInitials(name);
  const bgColor = stringToColor(name);

  const fallbackUrls = useMemo(
    () => buildFallbackUrls(companyUrl, companyName),
    [companyUrl, companyName]
  );

  // If we have a saved iconUrl use it first (failedIndex starts at -1)
  // On failure, walk through fallbackUrls
  let imageUrl: string | null = null;
  if (failedIndex === -1) {
    imageUrl = iconUrl || fallbackUrls[0] || null;
  } else {
    // Determine which fallback index to try
    const startIdx = iconUrl ? failedIndex : failedIndex;
    // If iconUrl was the first attempt (failedIndex=0 means iconUrl or fallback[0] failed)
    const nextIdx = iconUrl ? failedIndex : failedIndex + 1;
    if (nextIdx < fallbackUrls.length) {
      imageUrl = fallbackUrls[nextIdx];
    }
  }

  const handleError = () => {
    setFailedIndex((prev) => prev + 1);
  };

  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <Avatar className={`${dim} shrink-0 rounded-md`}>
      {imageUrl && (
        <AvatarImage
          src={imageUrl}
          alt={name}
          onError={handleError}
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
