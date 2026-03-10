import { describe, it, expect, vi } from "vitest";

/**
 * Page-level rendering smoke tests.
 *
 * These are lightweight checks that verify each page module can be imported
 * without throwing. They do NOT mount into a DOM (that would require mocking
 * react-router, supabase, etc.) — instead they confirm the module graph is
 * intact and no top-level errors exist.
 */

// Mock supabase client to prevent real network calls during import
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({ data: null }),
            }),
          }),
          maybeSingle: () => Promise.resolve({ data: null }),
          single: () => Promise.resolve({ data: null }),
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: [] }),
        }),
        limit: () => Promise.resolve({ data: [] }),
        maybeSingle: () => Promise.resolve({ data: null }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) }),
    }),
  },
}));

// Mock lovable auth
vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}));

// Mock Sentry
vi.mock("@sentry/react", () => ({
  captureException: vi.fn(),
  showReportDialog: vi.fn(),
  init: vi.fn(),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
}));

// Mock image imports
vi.mock("@/assets/mockup-resume.jpg", () => ({ default: "mock-resume.jpg" }));
vi.mock("@/assets/mockup-cover-letter.jpg", () => ({ default: "mock-cl.jpg" }));
vi.mock("@/assets/mockup-dashboard.jpg", () => ({ default: "mock-dash.jpg" }));
vi.mock("@/assets/mockup-roadmap.jpg", () => ({ default: "mock-road.jpg" }));
vi.mock("@/assets/mockup-custom-asset.jpg", () => ({ default: "mock-custom.jpg" }));
vi.mock("@/assets/resuvibe-logo.png", () => ({ default: "mock-logo.png" }));

const pages = [
  { name: "Landing", path: "@/pages/Landing" },
  { name: "Auth", path: "@/pages/Auth" },
  { name: "Profile", path: "@/pages/Profile" },
  { name: "Admin", path: "@/pages/Admin" },
  { name: "ApplicationDetail", path: "@/pages/ApplicationDetail" },
  { name: "Applications", path: "@/pages/Applications" },
  { name: "NewApplication", path: "@/pages/NewApplication" },
  { name: "Pricing", path: "@/pages/Pricing" },
  { name: "NotFound", path: "@/pages/NotFound" },
  { name: "Terms", path: "@/pages/Terms" },
  { name: "Privacy", path: "@/pages/Privacy" },
];

describe("Page-level rendering smoke tests", () => {
  for (const page of pages) {
    it(`${page.name} module can be imported without errors`, async () => {
      const mod = await import(/* @vite-ignore */ `../../pages/${page.name}`);
      expect(mod).toBeDefined();
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");
    });
  }
});
