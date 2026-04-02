

## Plan: Markdown Rendering, Tooltips, and Tab-Aware Chatbot

### 1. Render markdown in chatbot messages (`DashboardChatbot.tsx`)

Install `react-markdown` and use it to render assistant messages instead of raw text.

- Add `react-markdown` dependency
- Wrap assistant message content in `<ReactMarkdown>` with prose styling
- User messages remain plain text

### 2. Add rollover tooltips to live dashboard elements (`DashboardRenderer.tsx`)

Add `<Tooltip>` wrappers to interactive elements that lack them:
- **KPI cards**: tooltip showing the metric label + change detail
- **Chart blocks**: tooltip on chart title showing full title (useful when truncated)
- **Agent cards**: tooltip showing full `coreFunctionality` text
- **Scenario panels**: tooltip on title showing description preview

KpiCard already has hover effects; wrap it in a Tooltip showing `"{metric.label}: {metric.value} ({metric.change})"`.

### 3. Enhance chatbot system prompt for tab/page awareness (`dashboard-chat/index.ts`)

Expand the system prompt to include:
- **Navigation context**: list all nav items with their IDs and labels so the AI knows what tabs exist
- **Agentic Workforce context**: serialize agent names, functionality, and interfacing teams; note WIP status
- **CFO Scenarios context**: already included but add the slider details (labels, ranges, defaults)
- **Candidate context**: include candidate name, tagline, links
- **Tab purpose mapping**: add a paragraph explaining each standard tab type (overview = KPIs summary, cfo-view = scenario analysis, agentic-workforce = AI agent proposals, etc.)

### Files Changed

| File | Change |
|---|---|
| `package.json` | Add `react-markdown` dependency |
| `src/components/live-dashboard/DashboardChatbot.tsx` | Import ReactMarkdown, render assistant messages with markdown |
| `src/components/live-dashboard/DashboardRenderer.tsx` | Add Tooltip wrappers to KPI cards, chart titles, agent cards |
| `src/components/live-dashboard/KpiCard.tsx` | Accept optional tooltip prop or wrap internally |
| `supabase/functions/dashboard-chat/index.ts` | Enrich system prompt with navigation tabs, agentic workforce, candidate info, and tab purpose descriptions |

