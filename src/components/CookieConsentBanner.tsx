/**
 * GDPR-compliant cookie consent banner.
 * Stores preference in localStorage. Blocks analytics until accepted.
 * Compliant with EU ePrivacy Directive + GDPR requirements.
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/lib/branding";

const STORAGE_KEY = `${BRAND.storagePrefix}_cookie_consent`;

export type CookieConsent = {
  essential: true; // always on
  analytics: boolean;
  functional: boolean;
  timestamp: string;
};

function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeConsent(consent: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
  // Dispatch custom event so analytics can react
  window.dispatchEvent(new CustomEvent("cookie-consent-changed", { detail: consent }));
}

/** Check if analytics cookies were accepted */
export function hasAnalyticsConsent(): boolean {
  const consent = getStoredConsent();
  return consent?.analytics === true;
}

/** Check if any consent decision was made */
export function hasConsentDecision(): boolean {
  return getStoredConsent() !== null;
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [functional, setFunctional] = useState(true);

  useEffect(() => {
    // Only show if no consent decision exists
    if (!hasConsentDecision()) {
      // Small delay so it doesn't flash on page load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleAcceptAll = () => {
    const consent: CookieConsent = {
      essential: true,
      analytics: true,
      functional: true,
      timestamp: new Date().toISOString(),
    };
    storeConsent(consent);
    setVisible(false);
  };

  const handleRejectAll = () => {
    const consent: CookieConsent = {
      essential: true,
      analytics: false,
      functional: false,
      timestamp: new Date().toISOString(),
    };
    storeConsent(consent);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    const consent: CookieConsent = {
      essential: true,
      analytics,
      functional,
      timestamp: new Date().toISOString(),
    };
    storeConsent(consent);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9998] p-4 sm:p-6 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-lg rounded-xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-500">
        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5 h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cookie className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-foreground">We value your privacy</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We use cookies to improve your experience, analyze site usage, and assist in our
                marketing efforts. In accordance with EU regulations, we need your consent before
                setting non-essential cookies.{" "}
                <a href="/cookies" className="text-primary hover:underline underline-offset-2">
                  Cookie Policy
                </a>
              </p>
            </div>
          </div>

          {/* Expandable preferences */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            Customize preferences
          </button>

          {showDetails && (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              {/* Essential — always on */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs font-medium">Essential Cookies</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Required for authentication, security, and core functionality.
                  </p>
                </div>
                <Switch checked disabled className="opacity-60" />
              </div>

              {/* Functional */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs font-medium">Functional Cookies</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Remember preferences like theme, language, and UI settings.
                  </p>
                </div>
                <Switch checked={functional} onCheckedChange={setFunctional} />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-xs font-medium">Analytics Cookies</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Help us understand usage patterns to improve the product. Data is anonymized.
                  </p>
                </div>
                <Switch checked={analytics} onCheckedChange={setAnalytics} />
              </div>

              <Button size="sm" className="w-full" onClick={handleSavePreferences}>
                Save Preferences
              </Button>
            </div>
          )}

          {/* Action buttons */}
          {!showDetails && (
            <div className="flex items-center gap-2">
              <Button size="sm" className="flex-1" onClick={handleAcceptAll}>
                Accept All
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={handleRejectAll}>
                Reject Non-Essential
              </Button>
            </div>
          )}

          {/* GDPR compliance note */}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3 shrink-0" />
            <span>Compliant with GDPR and the EU ePrivacy Directive. You can change your preferences at any time.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
