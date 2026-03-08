import * as Sentry from "@sentry/react";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  // Only initialize in production with a configured DSN
  if (!SENTRY_DSN || import.meta.env.DEV) {
    console.log("[Sentry] Skipping init — no DSN or dev mode");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Performance monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    // Session replay - only on errors
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Environment
    environment: import.meta.env.MODE,
    // Filter out non-actionable errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore network errors from ad blockers
        if (error.message.includes("Failed to fetch") && error.message.includes("posthog")) {
          return null;
        }
        // Ignore ResizeObserver errors (browser quirk)
        if (error.message.includes("ResizeObserver")) {
          return null;
        }
      }
      return event;
    },
  });

  console.log("[Sentry] Initialized");
}

export { Sentry };
