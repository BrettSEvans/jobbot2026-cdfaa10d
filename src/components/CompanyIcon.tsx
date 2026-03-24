import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CompanyIconProps {
  companyName?: string | null;
  companyUrl?: string | null;
  iconUrl?: string | null;
  size?: "sm" | "md";
}

function getInitials(name: string): string {
  return name.split(/[\s&,]+/).filter(Boolean).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
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
  } catch { return null; }
}

function getSlugDomain(companyName?: string | null): string | null {
  if (!companyName) return null;
  const slug = companyName.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").replace(/[^a-z0-9]/g, "").trim();
  return slug ? `${slug}.com` : null;
}

/** Ordered list of logo URLs to attempt */
function buildCandidateUrls(iconUrl?: string | null, companyUrl?: string | null, companyName?: string | null): string[] {
  const urls: string[] = [];
  if (iconUrl) urls.push(iconUrl);
  const domain = getDomainFromUrl(companyUrl);
  const guessDomain = getSlugDomain(companyName);
  if (domain) {
    urls.push(`https://logo.clearbit.com/${domain}`);
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
  }
  if (guessDomain && guessDomain !== domain) {
    urls.push(`https://logo.clearbit.com/${guessDomain}`);
    urls.push(`https://www.google.com/s2/favicons?domain=${guessDomain}&sz=64`);
  }
  // Deduplicate
  return [...new Set(urls)];
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 45%)`;
}

export function CompanyIcon({ companyName, companyUrl, iconUrl, size = "sm" }: CompanyIconProps) {
  const [attempt, setAttempt] = useState(0);

  const candidates = useMemo(
    () => buildCandidateUrls(iconUrl, companyUrl, companyName),
    [iconUrl, companyUrl, companyName]
  );

  const name = companyName || "?";
  const imageUrl = attempt < candidates.length ? candidates[attempt] : null;
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";

  return (
    <Avatar className={`${dim} shrink-0 rounded-md`}>
      {imageUrl && (
        <AvatarImage
          key={imageUrl}
          src={imageUrl}
          alt={name}
          onError={() => setAttempt((a) => a + 1)}
          className="rounded-md object-contain p-0.5"
        />
      )}
      <AvatarFallback className="rounded-md text-white font-semibold" style={{ backgroundColor: stringToColor(name) }}>
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
