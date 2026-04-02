

## Plan: Optimize Model Selection + Custom API Key Support

### Current model audit

| Function | Current Model | Task Complexity | Proposed Model |
|---|---|---|---|
| `generate-dashboard` | gemini-2.5-pro | High (complex HTML/JS) | **Keep** gemini-2.5-pro |
| `refine-dashboard` | gemini-2.5-pro | High (streaming refine) | **Keep** gemini-2.5-pro |
| `generate-resume` | gemini-2.5-flash | High (ATS optimization) | **Upgrade** → gemini-3-flash-preview |
| `generate-resume-clarity` | gemini-2.5-flash | High | **Upgrade** → gemini-3-flash-preview |
| `generate-material` (main + review + condense + expand) | gemini-2.5-flash (×5 calls) | High (HTML generation) | **Upgrade** main → gemini-3-flash-preview; keep condense/expand as gemini-2.5-flash |
| `refine-material` | gemini-2.5-flash | Medium (streaming) | **Upgrade** → gemini-3-flash-preview |
| `research-company` | gemini-2.5-flash | Medium | **Upgrade** → gemini-3-flash-preview |
| `generate-raid-log` | gemini-2.5-flash | Medium | **Upgrade** → gemini-3-flash-preview |
| `generate-architecture-diagram` | gemini-2.5-flash | Medium | **Upgrade** → gemini-3-flash-preview |
| `generate-roadmap` | gemini-2.5-flash | Medium | **Upgrade** → gemini-3-flash-preview |
| `resume-diff` | gemini-2.5-flash | Medium (JSON) | **Upgrade** → gemini-3-flash-preview |
| `research-asset-best-practices` | gemini-2.5-flash (×2) | Low-Medium | **Upgrade** research → gemini-3-flash-preview; pattern extraction stays gemini-2.5-flash |
| `suggest-assets` | gemini-2.5-flash | Low | **Keep** gemini-2.5-flash (simple list) |
| `score-design-variability` | gemini-2.5-flash | Low | **Keep** gemini-2.5-flash (scoring) |
| `extract-jd-keywords` | gemini-2.5-flash | Low | **Keep** gemini-2.5-flash |
| `extract-resume-text` | gemini-2.5-flash | Low (OCR) | **Keep** gemini-2.5-flash |
| `generate-summary` | gemini-2.5-flash-lite | Low | **Keep** flash-lite |
| `analyze-bullets` (initial) | gemini-2.5-flash-lite | Low | **Keep** flash-lite |
| `analyze-bullets` (detailed) | gemini-2.5-flash | Medium | **Keep** gemini-2.5-flash |
| `tailor-cover-letter` | gemini-3-flash-preview | — | Already optimal |
| `parse-job-description` | gemini-3-flash-preview | — | Already optimal |
| `analyze-company` | gemini-3-flash-preview | — | Already optimal |

### Part 1: Model upgrades (12 edge functions)

Update model strings in **10 functions** (12 call sites) from `gemini-2.5-flash` → `gemini-3-flash-preview` for tasks that benefit from better reasoning. Low-complexity tasks (keyword extraction, scoring, summarization, OCR) stay on their current cost-efficient models.

### Part 2: Custom API key for power users

Allow users who have their own Google Gemini Pro API key to unlock premium models (gemini-2.5-pro) for all tasks, not just dashboards.

**Database**: Add a `custom_ai_key` encrypted column to `profiles` table (or a new `user_settings` table).

Actually — storing user API keys in the database is a security risk. Better approach:

**`supabase/functions/_shared/aiRetry.ts`** — Add a `modelTier` concept:
- Introduce a `MODEL_MAP` constant that maps task categories (`generation`, `refinement`, `extraction`, `scoring`) to models
- Each edge function passes its task category; the helper selects the right model
- This centralizes model selection so future upgrades only touch one file

**For custom keys**: This requires storing user secrets securely. The cleanest path is:
1. Add a Supabase secret `GOOGLE_AI_KEY` (optional) via the secrets tool
2. In `aiRetry.ts`, if `GOOGLE_AI_KEY` is set, route "heavy" tasks to `gemini-2.5-pro` via Google's API directly instead of the Lovable gateway

However, the Lovable AI Gateway only accepts `LOVABLE_API_KEY` — it doesn't proxy arbitrary Google keys. So a custom key would need direct Google API calls, which is a different code path.

### Revised Part 2: Tiered model selection in shared helper

Instead of custom keys (complex), centralize model selection so the right model is used per task complexity:

**`supabase/functions/_shared/aiRetry.ts`**:
- Add a `getModel(tier)` function with three tiers:
  - `'heavy'` → `google/gemini-2.5-pro` (dashboards, complex HTML)
  - `'standard'` → `google/gemini-3-flash-preview` (resumes, materials, analysis)
  - `'light'` → `google/gemini-2.5-flash-lite` (summaries, bullet scoring)
- Each edge function calls `getModel('standard')` instead of hardcoding a model string
- Future model upgrades only require changing one file

**Edge functions** (all 20): Replace hardcoded `model: 'google/...'` with `model: getModel('standard')` (or appropriate tier).

### Part 3: User-provided Google API key (future-ready)

Regarding your question about using your own Gemini Pro account — the Lovable AI Gateway authenticates with a platform-level key, so it doesn't support pass-through of personal API keys today. Two options:

1. **Not recommended now**: Build a parallel code path that calls `generativelanguage.googleapis.com` directly when a user-provided key is present — adds complexity and a second failure mode
2. **Recommended**: The tiered model approach above already routes complex tasks to `gemini-2.5-pro` via the gateway, giving you pro-level quality without needing your own key

### Changes summary

| File | Change |
|---|---|
| `supabase/functions/_shared/aiRetry.ts` | Add `getModel(tier)` helper with 3 tiers |
| 10 edge functions (12 call sites) | Upgrade `gemini-2.5-flash` → `gemini-3-flash-preview` via `getModel('standard')` |
| 3 edge functions | Switch to `getModel('heavy')` (dashboard gen/refine, already on pro) |
| 4 edge functions | Switch to `getModel('light')` (summary, bullet initial, keyword extract, resume OCR) |
| Remaining functions | Map to appropriate tier via `getModel()` |

### What stays the same
- Gateway URL and authentication unchanged
- Retry logic unchanged
- Streaming functions still stream
- No database changes needed
- No client-side changes

