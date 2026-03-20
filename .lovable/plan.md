

## Self-Improving Asset Intelligence (No Hardcoded Asset Types)

### Core Change from Previous Plan

The previous plan referenced `generate-raid-log`, `generate-architecture-diagram`, and `generate-roadmap` as fixed asset types. This revision eliminates all hardcoded asset types. Instead, the JD intelligence layer determines which materials are relevant for each application, and a single generic generation function produces them all.

### Current State

- Three dedicated edge functions exist: `generate-raid-log`, `generate-architecture-diagram`, `generate-roadmap`
- `backgroundGenerator.ts` hardcodes steps 7/8/9 calling each by name
- `proposed_assets` and `generated_assets` tables exist but are unused
- `parse-job-description` already extracts job function, seniority, and requirements — but doesn't propose materials

### Design

#### 1. JD-Driven Asset Proposal

Extend `parse-job-description` to return a `recommended_assets` array in its output schema. Based on the job function, seniority, and requirements, the AI determines which materials are valuable. Examples:
- PM role → 90-Day Roadmap, Stakeholder Map, RAID Log, Competitive Landscape
- Engineering role → Architecture Diagram, Technical Debt Assessment, On-Call Runbook
- Sales role → Territory Plan, Competitive Battlecard, Pipeline Strategy
- Executive role → Board Deck, Organizational Design, Strategic Vision

The AI proposes 3-6 assets per JD, each with a `name` and `brief_description`.

#### 2. Single Generic Generation Function

Replace the three hardcoded edge functions with one: **`generate-material`**. It accepts:
```json
{
  "assetName": "RAID Log",
  "assetDescription": "Risks, Assumptions, Issues, Dependencies for first 90 days",
  "jobDescription": "...",
  "companyName": "...",
  "jobTitle": "...",
  "competitors": [...],
  "products": [...],
  "customers": [...],
  "bestPractices": "...",
  "winningPatterns": {...}
}
```

The system prompt dynamically constructs generation instructions based on the asset name/description rather than being baked into a specific function. This means any asset type the AI proposes can be generated without new code.

#### 3. Pipeline Refactor (`backgroundGenerator.ts`)

Replace hardcoded steps 7/8/9 with a dynamic loop:

1. After JD intelligence parsing, read `recommended_assets` from the result
2. Save them to `proposed_assets` table (or use `selected_assets` on `job_applications`)
3. Loop through each proposed asset, calling `generate-material` for each
4. Save results to `generated_assets` table (which already exists)
5. Update progress dynamically: "Generating RAID Log (1/4)..." → "Generating Stakeholder Map (2/4)..."

The `GenerationJobStatus` type becomes open-ended (e.g., `"material:RAID Log"`) instead of hardcoded enum values.

#### 4. Global Best Practices Cache (`asset_best_practices` table)

Unchanged from previous plan — keyed by open-ended `asset_type` string:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| asset_type | text | Unique — any string |
| best_practices | text | AI-researched guidelines |
| winning_patterns | jsonb | Patterns from downloaded assets |
| sample_count | integer | Downloads analyzed |
| created_at / updated_at | timestamptz | |

RLS: SELECT for authenticated; INSERT/UPDATE via service role only.

#### 5. Download = Approval Signal (`asset_download_signals` table)

Unchanged from previous plan:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| application_id | uuid | FK to job_applications |
| asset_type | text | Open-ended string |
| job_title | text | Denormalized |
| industry | text | Derived from JD |
| asset_html_hash | text | Dedupe |
| created_at | timestamptz | |

RLS: INSERT by authenticated (own apps); SELECT by service role only.

#### 6. Research + Pattern Extraction (`research-asset-best-practices`)

Same as previous plan — works for any asset type string. Called by `generate-material` before building the prompt. Checks cache, researches if stale (>30 days), analyzes top-downloaded HTML samples if ≥5 signals exist.

#### 7. Prompt Injection in `generate-material`

Before generating any asset, `generate-material` fetches `asset_best_practices` for the normalized asset type and appends to the system prompt:

```
## Best Practices Research
{researched guidelines}

## Patterns from High-Quality Examples (based on N user-approved downloads)
{extracted structural and visual patterns}
```

#### 8. Download Tracking in Frontend

Every download action (core materials stored in `job_applications` columns AND dynamic materials in `generated_assets`) inserts a row into `asset_download_signals`. Fire-and-forget.

### Migration Path for Existing Data

- Existing `raid_log_html`, `architecture_diagram_html`, `roadmap_html` columns on `job_applications` remain for backward compatibility
- New applications store all materials in `generated_assets` via the generic flow
- The three old edge functions (`generate-raid-log`, `generate-architecture-diagram`, `generate-roadmap`) are deprecated but kept temporarily — the pipeline stops calling them
- The Materials tab UI reads from `generated_assets` instead of checking individual columns

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `asset_best_practices` + `asset_download_signals` tables |
| `supabase/functions/generate-material/index.ts` | New — generic asset generator |
| `supabase/functions/research-asset-best-practices/index.ts` | New — BP research + pattern extraction |
| `supabase/functions/parse-job-description/index.ts` | Add `recommended_assets` to output schema |
| `src/lib/backgroundGenerator.ts` | Replace steps 7-9 with dynamic asset loop using `generate-material` |
| `src/pages/ApplicationDetail.tsx` | Read materials from `generated_assets`; add download signal inserts |
| `supabase/config.toml` | Add function configs for new functions |

### Key Properties

- **Zero hardcoded asset types** — the JD determines what gets generated
- **One generation function** — `generate-material` handles any asset type
- **Downloads = votes** — user behavior improves future generation for all users globally
- **Backward compatible** — existing applications with data in `raid_log_html` etc. still render
- **Lazy research** — best practices cached per asset type, refreshed every 30 days

