

## Plan: Parallelize Material Generation with Concurrency Pool

### Current behavior
Materials (RAID Log, Architecture Diagram, etc.) are generated **one at a time** in a `for` loop with a 3-second delay between each, inside `backgroundGenerator.ts` lines 418-498. With 6-8 assets, this adds 30-50 seconds of idle waiting.

### Approach
Replace the sequential `for` loop with a **concurrency pool** that runs up to 3 material generations simultaneously. Each slot in the pool starts the next asset as soon as it finishes, maintaining a maximum of 3 in-flight AI calls. A 1-second stagger between launches prevents burst-loading the gateway.

### Changes

**`src/lib/backgroundGenerator.ts`** (lines ~402-498)

1. Add a `runWithConcurrency(tasks, limit, staggerMs)` helper function:
   - Accepts an array of async task functions, a concurrency limit (3), and a stagger delay (1000ms)
   - Maintains a pool of active promises; as each resolves, the next task is dequeued and started
   - Returns all results (settled) when complete

2. Replace the sequential `for` loop (lines 418-498) with the concurrency pool:
   - Each task function encapsulates: insert `generated_assets` row → fetch `generate-material` → update row with result/error
   - Progress updates show "Generating materials (N/M)..." with a counter that increments on each task completion
   - The `currentAsset` field updates to show all currently in-flight asset names

3. Remove the 3-second `setTimeout` delay between assets — the 1-second stagger + concurrency limit of 3 provides sufficient rate-limit protection while being ~2-3x faster overall.

### What stays the same
- The `proposed_assets` upsert loop before generation (non-AI, fast)
- Design variability scoring after all materials complete
- Dashboard generation flow (unchanged)
- AbortController timeout per asset (120s)
- Error handling per asset (individual failures don't block others)

### Expected speedup
With 6 assets at ~15s each: sequential = ~108s (6×15 + 5×3), pooled = ~35s (2 waves of 3).

