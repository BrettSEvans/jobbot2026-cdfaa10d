

## Plan: WIP Banner, Department Title, Visual Polish, and Background Color in Prompts

### Changes

#### 1. Agentic Workforce WIP banner (`DashboardRenderer.tsx`)
Add a styled "Work in Progress" callout at the top of the Agentic Workforce section using `primaryContainer`/`onPrimaryContainer` colors with a construction icon.

#### 2. Retitle header to department-first (`DashboardRenderer.tsx`)
Change header from `{companyName} — {jobTitle}` to `{companyName} — {department}`. Move `jobTitle` to subtitle.

#### 3. Visual polish — Plaid-inspired (`DashboardRenderer.tsx`)
- Gradient header: blend `primary` to a darker shade instead of flat color
- Section entrance: add CSS fade-in animation via inline keyframes
- Subtle SVG background pattern on the surface (low-opacity topographic/wave lines)
- Hover scale on KPI cards and agent cards
- Gradient overlay on Candidate Hero

#### 4. Add `background` field to branding schema (`schema.ts`)
Add optional `background?: string` to `DashboardBranding` for page background color/gradient.

#### 5. Apply background color in renderer (`DashboardRenderer.tsx`)
Use `data.branding.background` (falling back to `surface`) for the outermost container background.

#### 6. Update live dashboard generation prompt (`generate-dashboard/index.ts`)
- Add `"background"` field to the branding schema in the prompt: `"background": "#hex or CSS gradient — page background color derived from branding. Use a subtle tint or gradient, not plain white."`
- Add instruction: "The branding.background should be a subtle gradient or tinted surface color derived from the company's palette — not plain #FFFFFF."
- Update title guidance: "meta.department should be prominent; the header displays `{companyName} — {department}`"
- Add agentic workforce WIP note: "The agenticWorkforce section description should note it is a work in progress"

#### 7. Update refine prompt (`refine-dashboard/index.ts`)
Add `"background"` to the branding schema block in the JSON refinement system prompt.

#### 8. Update downloadable dashboard generation prompt (`generate-dashboard/index.ts`)
The same prompt already serves both live and downloadable dashboards, so the background color addition covers both. Ensure the downloadable template's CSS (`styles.ts`) respects `background` if present by applying it via the JS rendering engine (already handles branding overrides).

#### 9. Update downloadable template scripts (`scripts.ts`)
In the branding application logic, apply `data.branding.background` to `document.body.style.background` if present.

### Files Changed

| File | Change |
|---|---|
| `src/lib/dashboard/schema.ts` | Add `background?: string` to `DashboardBranding` |
| `src/components/live-dashboard/DashboardRenderer.tsx` | WIP banner, department-first title, gradient header, fade-in animations, SVG background pattern, hover effects, use `branding.background` |
| `supabase/functions/generate-dashboard/index.ts` | Add `background` to branding schema in prompt, department-first title guidance, agentic WIP note |
| `supabase/functions/refine-dashboard/index.ts` | Add `background` to branding schema in refinement prompt |
| `src/lib/dashboard/templates/scripts.ts` | Apply `branding.background` to body if present |

### What stays the same
- Database — no migrations
- `PublishDashboard.tsx` — unchanged
- `LiveDashboard.tsx` — unchanged (inherits via DashboardRenderer)
- Downloadable template CSS (`styles.ts`) — unchanged (JS applies background at runtime)

