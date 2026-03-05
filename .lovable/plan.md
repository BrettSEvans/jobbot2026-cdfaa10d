

# JobBot Priority Roadmap

Based on the competitive landscape analysis and product critique, here is the prioritized update schedule with rationale for each item.

```text
┌────┬───────────────────────────────┬──────────┬────────────┬─────────────────────────────────────────────────────┐
│ #  │ Update                        │ Priority │ Effort     │ Rationale                                           │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│  1 │ Subscription Infrastructure   │ CRITICAL │ 1-2 weeks  │ No revenue path exists. Nothing else matters        │
│    │ (Polar tiers + gating)        │          │            │ without monetization. Blocks launch entirely.        │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│  2 │ Public Landing Page           │ CRITICAL │ 3-5 days   │ No way for prospects to understand the product.      │
│    │                               │          │            │ Auth wall kills all top-of-funnel. Must showcase      │
│    │                               │          │            │ unique assets (RAID, dashboards) as differentiators.  │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│  3 │ ATS Match Score               │ HIGH     │ 3-5 days   │ Table-stakes feature offered by 6/7 competitors.     │
│    │                               │          │            │ Users expect it. Strongest signal of product          │
│    │                               │          │            │ competence at first glance.                           │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│  4 │ Application Pipeline Stages   │ HIGH     │ 3-5 days   │ Teal's #1 feature. Without it, users need a second   │
│    │ (kanban tracker)              │          │            │ tool to track progress, reducing stickiness.          │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│  5 │ DOCX Export                   │ HIGH     │ 1-2 days   │ 5/7 competitors offer it. Many ATS systems and       │
│    │                               │          │            │ recruiters require .docx uploads. PDF-only is a       │
│    │                               │          │            │ dealbreaker for some users.                           │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│  6 │ Mobile Responsive UI          │ MEDIUM   │ 3-5 days   │ Job seekers browse on phones. Current desktop-only    │
│    │                               │          │            │ layout loses a significant user segment.              │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│  7 │ Selective Asset Generation    │ MEDIUM   │ 2-3 days   │ 8-step sequential pipeline is slow and wasteful.     │
│    │ (skip/choose which assets)    │          │            │ Free-tier users especially need fast results on       │
│    │                               │          │            │ just resume + cover letter.                           │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│  8 │ Onboarding Flow               │ MEDIUM   │ 2-3 days   │ New users hit a blank profile page with no guidance.  │
│    │ (guided first-run wizard)     │          │            │ Resume upload + JD paste should be frictionless.      │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│  9 │ Code Cleanup                  │ LOW      │ 2-3 days   │ Profile.tsx (746 lines), duplicated pipeline in       │
│    │ (decompose, remove as-any)    │          │            │ NewApplication.tsx — tech debt that slows all          │
│    │                               │          │            │ future development.                                   │
├────┼───────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────────────────┤
│ 10 │ Chrome Extension              │ LOW      │ 2-4 weeks  │ 4/7 competitors have one. Important for retention     │
│    │ (LinkedIn/Indeed import)       │          │            │ but high effort and not viable inside Lovable.        │
│    │                               │          │            │ Defer until post-launch.                              │
└────┴───────────────────────────────┴──────────┴────────────┴─────────────────────────────────────────────────────┘
```

## Phased Schedule

**Phase 1 — Launch-Blocking (Weeks 1-3)**
Items 1-2. Without payment infrastructure and a public-facing page, there is no product to sell.

**Phase 2 — Competitive Parity (Weeks 3-5)**
Items 3-5. These close the most visible feature gaps vs Teal, Rezi, and Swooped. Match Score and DOCX export are low-effort, high-signal features that immediately raise perceived product maturity.

**Phase 3 — Retention & Polish (Weeks 5-7)**
Items 6-8. Mobile support, faster generation, and onboarding reduce churn and improve activation rates.

**Phase 4 — Maintenance & Future (Ongoing)**
Items 9-10. Tech debt cleanup enables velocity. Chrome extension is a post-launch growth lever.

