import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { streamFromEdgeFunction } from "../streamUtils";

// Mock fetch globally
const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  globalThis.fetch = originalFetch;
});

describe("streamFromEdgeFunction timeout", () => {
  it("aborts after the configured timeout", async () => {
    // fetch that hangs forever but rejects cleanly on abort
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          const onAbort = () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          };
          if (init?.signal?.aborted) {
            onAbort();
            return;
          }
          init?.signal?.addEventListener("abort", onAbort);
        })
    );

    const onDone = vi.fn();

    const promise = streamFromEdgeFunction({
      functionName: "test-fn",
      body: {},
      onDelta: vi.fn(),
      onDone,
      timeoutMs: 5000,
    });

    // Advance past the timeout
    vi.advanceTimersByTime(5001);

    await expect(promise).rejects.toThrow();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("does not abort before the timeout if stream completes", async () => {
    const encoder = new TextEncoder();
    const ssePayload =
      `data: ${JSON.stringify({ choices: [{ delta: { content: "hi" } }] })}\n\ndata: [DONE]\n\n`;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(ssePayload));
          controller.close();
        },
      }),
      json: () => Promise.resolve({}),
    });

    const onDelta = vi.fn();
    const onDone = vi.fn();

    await streamFromEdgeFunction({
      functionName: "test-fn",
      body: {},
      onDelta,
      onDone,
      timeoutMs: 60000,
    });

    expect(onDelta).toHaveBeenCalledWith("hi");
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("respects an external abort signal", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        })
    );

    const externalController = new AbortController();

    const promise = streamFromEdgeFunction({
      functionName: "test-fn",
      body: {},
      onDelta: vi.fn(),
      onDone: vi.fn(),
      timeoutMs: 0, // disable internal timeout
      signal: externalController.signal,
    });

    externalController.abort();

    await expect(promise).rejects.toThrow();
  });
});
