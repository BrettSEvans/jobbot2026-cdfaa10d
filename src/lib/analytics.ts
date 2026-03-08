/**
 * Lightweight analytics abstraction.
 * Uses PostHog when available AND user has given cookie consent.
 * Falls back to console in dev.
 * 
 * Usage:
 *   import { analytics } from "@/lib/analytics";
 *   analytics.track("generation_started", { assetType: "resume" });
 *   analytics.identify(userId, { email, tier });
 */
import { hasAnalyticsConsent } from "@/components/CookieConsentBanner";

interface AnalyticsClient {
  track: (event: string, properties?: Record<string, unknown>) => void;
  identify: (userId: string, traits?: Record<string, unknown>) => void;
  page: (name?: string) => void;
  reset: () => void;
}

let posthog: any = null;

function getPostHog(): any {
  return posthog;
}

let storedApiKey: string | undefined;

/** Initialize PostHog — call once at app boot. Respects cookie consent. */
export async function initAnalytics(apiKey?: string) {
  storedApiKey = apiKey;

  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.info("[analytics] No API key — running in debug mode");
    }
    return;
  }

  // Only init if user has consented to analytics cookies (GDPR)
  if (!hasAnalyticsConsent()) {
    if (import.meta.env.DEV) {
      console.info("[analytics] Analytics cookies not accepted — deferring init");
    }
    // Listen for consent changes
    window.addEventListener("cookie-consent-changed", () => {
      if (hasAnalyticsConsent() && !posthog) {
        loadPostHog(apiKey);
      }
    });
    return;
  }

  await loadPostHog(apiKey);
}

async function loadPostHog(apiKey: string) {
  try {
    const ph = await import("posthog-js");
    ph.default.init(apiKey, {
      api_host: "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: true,
      capture_pageleave: true,
      loaded: () => {
        posthog = ph.default;
      },
    });
    posthog = ph.default;
  } catch (err) {
    console.warn("[analytics] PostHog failed to load:", err);
  }
  }
}

export const analytics: AnalyticsClient = {
  track(event, properties) {
    const ph = getPostHog();
    if (ph) {
      ph.capture(event, properties);
    } else if (import.meta.env.DEV) {
      console.debug(`[analytics] track: ${event}`, properties);
    }
  },

  identify(userId, traits) {
    const ph = getPostHog();
    if (ph) {
      ph.identify(userId, traits);
    } else if (import.meta.env.DEV) {
      console.debug(`[analytics] identify: ${userId}`, traits);
    }
  },

  page(name) {
    const ph = getPostHog();
    if (ph) {
      ph.capture("$pageview", name ? { page_name: name } : undefined);
    }
  },

  reset() {
    const ph = getPostHog();
    if (ph) {
      ph.reset();
    }
  },
};
