/**
 * Centralized brand configuration.
 *
 * To rebrand the app, update the values below.
 * Every UI reference to the brand name imports from this file.
 *
 * NOTE: index.html meta tags (og:title, twitter:title, etc.) and
 * docs/ADMIN_GUIDE.md must be updated manually — search for "REBRAND".
 */
export const BRAND = {
  /** Display name shown throughout the UI */
  name: "JobBot",
  /** Tagline used in page title and hero badges */
  tagline: "AI-Powered Job Application Toolkit",
  /** Meta description / marketing one-liner */
  description:
    "Using this isn't fair to the other applicants. Sorry not sorry.",
  /** Twitter handle for social meta tags */
  twitter: "@JobBot",
  /** Copyright line helper */
  copyright: (year: number) => `© ${year} ${BRAND.name}. All rights reserved.`,
  /**
   * Prefix for all localStorage / sessionStorage keys.
   * Changing this will reset user preferences (theme, tutorial state, etc.).
   */
  storagePrefix: "jobbot",
} as const;
