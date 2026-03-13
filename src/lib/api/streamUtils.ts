/**
 * Shared SSE stream utilities.
 * Eliminates duplicated SSE parsing logic across asset API files.
 */

/**
 * Call a Supabase Edge Function that returns an SSE stream,
 * and pipe deltas to the caller via onDelta/onDone callbacks.
 */
/** Default SSE stream timeout: 2 minutes */
const DEFAULT_STREAM_TIMEOUT_MS = 120_000;

export async function streamFromEdgeFunction({
  functionName,
  body,
  onDelta,
  onDone,
  timeoutMs = DEFAULT_STREAM_TIMEOUT_MS,
  signal: externalSignal,
}: {
  functionName: string;
  body: Record<string, unknown>;
  onDelta: (text: string) => void;
  onDone: () => void;
  /** Timeout in milliseconds (default 120 000). Set to 0 to disable. */
  timeoutMs?: number;
  /** Optional external AbortSignal for caller-controlled cancellation. */
  signal?: AbortSignal;
}): Promise<void> {
  const controller = new AbortController();
  const timeoutId = timeoutMs > 0
    ? setTimeout(() => controller.abort(new Error(`SSE stream timed out after ${timeoutMs / 1000}s`)), timeoutMs)
    : undefined;

  // If the caller provides an external signal, forward its abort
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
    }
  }

  try {
    const resp = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );

    if (!resp.ok || !resp.body) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Request failed (${resp.status})`);
    }

    await processSSEStream(resp.body, onDelta, onDone);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

/**
 * Process an SSE (Server-Sent Events) ReadableStream, extracting
 * OpenAI-compatible delta content from each `data:` line.
 */
export async function processSSEStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
  onDone: () => void
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;

      const json = line.slice(6).trim();
      if (json === '[DONE]') { streamDone = true; break; }

      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        // Incomplete JSON chunk — push back and wait for more data
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  // Flush remaining buffer (only if stream ended without [DONE])
  if (!streamDone && buffer.trim()) {
    for (let raw of buffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (!raw.startsWith('data: ')) continue;
      const json = raw.slice(6).trim();
      if (json === '[DONE]') continue;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch (e) { console.warn("Failed to parse trailing SSE chunk:", e); }
    }
  }

  onDone();
}
