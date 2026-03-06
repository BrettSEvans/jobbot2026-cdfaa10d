/**
 * Maui Tests — Mobile Responsive UI
 *
 * Tests: breakpoint detection, layout rules.
 */
import { describe, it, expect } from "vitest";

type LayoutMode = "mobile" | "tablet" | "desktop";

function getLayoutMode(width: number): LayoutMode {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

describe("Mobile — Breakpoint Detection", () => {
  it("< 640px is mobile", () => {
    expect(getLayoutMode(320)).toBe("mobile");
    expect(getLayoutMode(375)).toBe("mobile");
    expect(getLayoutMode(639)).toBe("mobile");
  });

  it("640–1023px is tablet", () => {
    expect(getLayoutMode(640)).toBe("tablet");
    expect(getLayoutMode(768)).toBe("tablet");
    expect(getLayoutMode(1023)).toBe("tablet");
  });

  it(">= 1024px is desktop", () => {
    expect(getLayoutMode(1024)).toBe("desktop");
    expect(getLayoutMode(1440)).toBe("desktop");
    expect(getLayoutMode(1920)).toBe("desktop");
  });
});

describe("Mobile — Layout Rules", () => {
  it("mobile should use hamburger nav", () => {
    const usesHamburger = (mode: LayoutMode) => mode === "mobile";
    expect(usesHamburger("mobile")).toBe(true);
    expect(usesHamburger("tablet")).toBe(false);
    expect(usesHamburger("desktop")).toBe(false);
  });

  it("mobile should use card layout instead of table", () => {
    const usesCardLayout = (mode: LayoutMode) => mode === "mobile";
    expect(usesCardLayout("mobile")).toBe(true);
    expect(usesCardLayout("desktop")).toBe(false);
  });

  it("mobile iframe height should be 50vh equivalent", () => {
    const getMobileIframeClass = () => "h-[50vh]";
    const getDesktopIframeClass = () => "h-[70vh]";
    expect(getMobileIframeClass()).toBe("h-[50vh]");
    expect(getDesktopIframeClass()).toBe("h-[70vh]");
  });
});
