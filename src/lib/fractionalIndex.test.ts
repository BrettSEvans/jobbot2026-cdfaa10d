import { describe, it, expect } from "vitest";
import { midpoint } from "./fractionalIndex";

describe("midpoint", () => {
  it("returns 'm' for empty inputs", () => {
    expect(midpoint("", "")).toBe("m");
  });

  it("returns value between a and b", () => {
    const mid = midpoint("a", "z");
    expect(mid > "a").toBe(true);
    expect(mid < "z").toBe(true);
  });

  it("handles no lower bound", () => {
    const result = midpoint("", "m");
    expect(result.length).toBeGreaterThan(0);
    expect(result < "m").toBe(true);
  });

  it("handles no upper bound", () => {
    const result = midpoint("m", "");
    expect(result > "m").toBe(true);
  });

  it("handles adjacent values", () => {
    const result = midpoint("a", "b");
    expect(result.length).toBeGreaterThan(0);
  });

  it("swaps if a >= b", () => {
    const result = midpoint("z", "a");
    expect(result > "a").toBe(true);
    expect(result < "z").toBe(true);
  });
});
