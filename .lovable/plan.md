# JobBot Priority Roadmap ("Maui Plan")

Based on the competitive landscape analysis and product critique, here is the prioritized update schedule with rationale for each item.

## Feature Priority Matrix

| # | Update | Priority | Effort | Rationale | Status |
|---|--------|----------|--------|-----------|--------|
| 1 | Subscription Infrastructure | CRITICAL | 1–2 weeks | No revenue path exists. Nothing else matters without monetization. Blocks launch entirely. | ✅ DONE — 3-tier system (Free/Pro/Premium), feature gating, admin management, tier-based rate limiting |
| 2 | Public Landing Page | CRITICAL | 3–5 days | No way for prospects to understand the product. Auth wall kills all top-of-funnel. Must showcase unique assets (RAID, dashboards) as differentiators. | 🔲 TODO |
| 3 | ATS Match Score | HIGH | 3–5 days | Table-stakes feature offered by 6/7 competitors. Users expect it. Strongest signal of product competence at first glance. | 🔲 TODO |
| 4 | Application Pipeline Stages | HIGH | 3–5 days | Teal's #1 feature. Without it, users need a second tool to track progress, reducing stickiness. | 🔲 TODO |
| 5 | DOCX Export | HIGH | 1–2 days | 5/7 competitors offer it. Many ATS systems and recruiters require .docx uploads. PDF-only is a dealbreaker for some users. | 🔲 TODO |
| 6 | Mobile Responsive UI | MEDIUM | 3–5 days | Job seekers browse on phones. Current desktop-only. | 🔲 TODO |
| 7 | Selective Asset Generation (skip/choose which assets) | MEDIUM | 2–3 days | 8-step sequential pipeline is slow and wasteful. Free-tier users especially need fast results on just resume + cover letter. | 🔲 TODO |
| 8 | Onboarding Flow (guided first-run wizard) | MEDIUM | 2–3 days | New users hit a blank profile page with no guidance. Resume upload + JD paste should be frictionless. | 🔲 TODO |
| 9 | Code Cleanup (decompose, remove as-any) | LOW | 2–3 days | Profile.tsx 746 lines, duplicated pipeline in NewApplication.tsx — tech debt that slows all future development. | 🔲 TODO |
| 10 | Chrome Extension (LinkedIn/Indeed import) | LOW | 2–4 weeks | 4/7 competitors have one. Important for retention but high effort and not viable inside Lovable. Defer until post-launch. | 🔲 TODO |

---

## Phased Schedule

### Phase 1 — Launch-Blocking (Weeks 1–3)
Items 1 & 2. Without payment infrastructure and a public-facing page, there is no product to sell.

- ✅ **Item 1 — Subscription Infrastructure**: 3-tier model (Free $0 / Pro $19 / Premium $39), `user_subscriptions` table with auto-provisioning trigger, `useSubscription` hook, `UpgradeGate` component, app creation limits, header tier badge, admin Subs tab, tier-based generation rate limiting (Free: 5/hr 15/day, Pro: 20/hr 100/day, Premium: 50/hr 250/day), pricing page at `/pricing`.
- 🔲 **Item 2 — Public Landing Page**: Needs public-facing page showcasing product value, asset examples, and pricing. Remove auth wall from top-of-funnel.

### Phase 2 — Competitive Parity (Weeks 3–5)
Items 3–5. These close the most visible feature gaps vs Teal, Rezi, and Swooped. Match Score and DOCX export are low-effort, high-signal features that immediately raise perceived product maturity.

### Phase 3 — Retention & Polish (Weeks 5–7)
Items 6–8. Mobile support, faster generation, and onboarding reduce churn and improve activation rates.

### Phase 4 — Maintenance & Future (Ongoing)
Items 9–10. Tech debt cleanup enables velocity. Chrome extension is a post-launch growth lever.
