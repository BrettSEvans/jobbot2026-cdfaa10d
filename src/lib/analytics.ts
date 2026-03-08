/**
 * Lightweight analytics abstraction.
 * Uses PostHog when available, falls back to console in dev.
 * 
 * Usage:
 *   import { analytics } from "@/lib/analytics";
 *   analytics.track("generation_started", { assetType: "resume" });
 *   analytics.identify(userId, { email, tier });
 */

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

/** Initialize PostHog — call once at app boot */
export async function initAnalytics(apiKey?: string) {
  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.info("[analytics] No API key — running in debug mode");
    }
    return;
  }

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
