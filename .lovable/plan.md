

## Plan: Server-Side Dashboard Output Validation

### Problem
All parsing, repair, and validation currently happens client-side after the full stream is accumulated. If the AI produces malformed JSON, the client tries to fix it — but sometimes fails, resulting in raw code rendered in the iframe or silent errors. Moving validation to the server catches and repairs issues before they reach the UI.

### Approach
Change the edge function from a pass-through stream proxy to a **buffered validation pipeline**: consume the AI stream server-side, apply the same repair/validation logic, and return either clean validated JSON or a structured error.

### Changes

**`supabase/functions/generate-dashboard/index.ts`**
- Instead of proxying `response.body` directly to the client, consume the SSE stream server-side and accumulate the full AI output
- Add inline parsing/repair functions (adapted from `assembler.ts` for Deno):
  - Strip markdown fences, extract JSON braces
  - Sanitize `new Date()` expressions, trailing commas, unquoted keys
  - Repair truncated JSON (bracket-counting closure)
  - Validate required top-level fields: `meta`, `branding`, `navigation`, `sections`
  - Validate each section has `id`, `title`, `metrics`, `charts`, `tables`
  - Ensure `globalFilters` options start with "All"
  - Ensure `navigation` includes `agentic-workforce` and `cfo-view` entries
- Return validated JSON as `{ success: true, data: <DashboardData> }` on success
- Return `{ success: false, error: "..." }` with details on irrecoverable failure

**`src/lib/api/jobApplication.ts`**
- Update `streamDashboardGeneration` to support both streaming and buffered response modes
- If the response `Content-Type` is `application/json` (validated response), parse it directly instead of processing as SSE stream

**`src/hooks/useDashboardEditor.ts`**
- Simplify `onDone` handler: the server now guarantees valid JSON or a clear error — remove redundant client-side repair fallbacks
- Keep `parseLlmJsonOutput` as a safety net but it should rarely be needed

### What stays the same
- Client-side `parseLlmJsonOutput` and `repairTruncatedJson` remain as a defense-in-depth layer
- The generation prompt in the edge function is unchanged
- The refinement flow (`refine-dashboard`) is unchanged (separate concern)

### Trade-off
The response is no longer streamed progressively — the client receives the full validated payload at once. The existing progress bar / "Generating..." UI still works since it shows during the request. This is acceptable because reliability is more important than showing partial JSON text.

