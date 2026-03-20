const AI_GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

export interface AiRequestOptions {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  response_format?: { type: string };
  tools?: any[];
  tool_choice?: any;
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

export interface AiRetryOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  /** Status codes that should NOT be retried (e.g. 402, 429 are caller-handled) */
  noRetryStatuses?: number[];
}

/**
 * Calls the AI gateway with automatic retry on transient failures (5xx, network errors).
 * Does NOT retry on 402 (credits) or 429 (rate limit) — those are returned for caller handling.
 */
export async function aiFetchWithRetry(
  apiKey: string,
  body: AiRequestOptions,
  opts: AiRetryOptions = {},
): Promise<Response> {
  const { maxRetries = 1, retryDelayMs = 2000, noRetryStatuses = [402, 429] } = opts;

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(AI_GATEWAY_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Non-retryable status codes — return immediately for caller to handle
      if (noRetryStatuses.includes(response.status)) {
        return response;
      }

      // Success — return
      if (response.ok) {
        return response;
      }

      // Retryable failure (5xx etc.)
      lastResponse = response;
      if (attempt < maxRetries) {
        const delay = retryDelayMs * (attempt + 1); // linear backoff
        console.warn(`AI request failed (${response.status}), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    } catch (err) {
      // Network error — retryable
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = retryDelayMs * (attempt + 1);
        console.warn(`AI request network error, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`, lastError.message);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  // All retries exhausted — return last response or throw
  if (lastResponse) return lastResponse;
  throw lastError || new Error('AI request failed after retries');
}
