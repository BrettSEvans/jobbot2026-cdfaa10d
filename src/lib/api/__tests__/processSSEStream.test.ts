import { describe, it, expect, vi } from "vitest";
import { processSSEStream } from "../streamUtils";

/** Helper: create a ReadableStream from an array of string chunks */
function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(encoder.encode(chunks[i]));
        i++;
      } else {
        controller.close();
      }
    },
  });
}

/** Helper: build an SSE data line from content */
function sseDataLine(content: string): string {
  const payload = JSON.stringify({ choices: [{ delta: { content } }] });
  return `data: ${payload}\n\n`;
}

describe("processSSEStream", () => {
  it("extracts delta content from a single chunk", async () => {
    const deltas: string[] = [];
    const onDone = vi.fn();

    const stream = makeStream([sseDataLine("Hello")]);
    await processSSEStream(stream, (t) => deltas.push(t), onDone);

    expect(deltas).toEqual(["Hello"]);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("extracts multiple deltas from multiple chunks", async () => {
    const deltas: string[] = [];
    const stream = makeStream([
      sseDataLine("one"),
      sseDataLine("two"),
      sseDataLine("three"),
    ]);
    await processSSEStream(stream, (t) => deltas.push(t), vi.fn());
    expect(deltas).toEqual(["one", "two", "three"]);
  });

  it("handles multiple data lines in a single chunk", async () => {
    const deltas: string[] = [];
    const stream = makeStream([
      sseDataLine("A") + sseDataLine("B") + sseDataLine("C"),
    ]);
    await processSSEStream(stream, (t) => deltas.push(t), vi.fn());
    expect(deltas).toEqual(["A", "B", "C"]);
  });

  it("stops at [DONE] marker", async () => {
    const deltas: string[] = [];
    const stream = makeStream([
      sseDataLine("before") + "data: [DONE]\n\n" + sseDataLine("after"),
    ]);
    await processSSEStream(stream, (t) => deltas.push(t), vi.fn());
    expect(deltas).toEqual(["before"]);
  });

  it("ignores SSE comment lines (starting with :)", async () => {
    const deltas: string[] = [];
    const stream = makeStream([
      ": this is a comment\n" + sseDataLine("real"),
    ]);
    await processSSEStream(stream, (t) => deltas.push(t), vi.fn());
    expect(deltas).toEqual(["real"]);
  });

  it("ignores empty lines", async () => {
    const deltas: string[] = [];
    const stream = makeStream([
      "\n\n\n" + sseDataLine("data") + "\n\n",
    ]);
    await processSSEStream(stream, (t) => deltas.push(t), vi.fn());
    expect(deltas).toEqual(["data"]);
  });

  it("handles split chunks (data line split across two chunks)", async () => {
    const deltas: string[] = [];
    const fullLine = sseDataLine("split-test");
    // Split in the middle of the line
    const mid = Math.floor(fullLine.length / 2);
    const stream = makeStream([fullLine.slice(0, mid), fullLine.slice(mid)]);
    await processSSEStream(stream, (t) => deltas.push(t), vi.fn());
    expect(deltas).toEqual(["split-test"]);
  });

  it("handles \\r\\n line endings", async () => {
    const deltas: string[] = [];
    const payload = JSON.stringify({ choices: [{ delta: { content: "crlf" } }] });
    const stream = makeStream([`data: ${payload}\r\n\r\n`]);
    await processSSEStream(stream, (t) => deltas.push(t), vi.fn());
    expect(deltas).toEqual(["crlf"]);
  });

  it("skips data lines with no delta content", async () => {
    const deltas: string[] = [];
    const noContent = JSON.stringify({ choices: [{ delta: {} }] });
    const stream = makeStream([
      `data: ${noContent}\n\n` + sseDataLine("has-content"),
    ]);
    await processSSEStream(stream, (t) => deltas.push(t), vi.fn());
    expect(deltas).toEqual(["has-content"]);
  });

  it("calls onDone even with empty stream", async () => {
    const onDone = vi.fn();
    const stream = makeStream([]);
    await processSSEStream(stream, vi.fn(), onDone);
    expect(onDone).toHaveBeenCalledOnce();
  });
});
