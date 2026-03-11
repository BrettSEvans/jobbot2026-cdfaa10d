

## Plan: Add Helpdesk Email to Footer + SEO Improvements

### 1. Footer — Helpdesk Email

**File: `src/pages/Landing.tsx`** (footer section, ~line 520)
- Add `Helpdesk@ResuVibe.com` in bold, using `text-foreground font-bold` (dark branded color)
- Place it as its own line above the legal links

### 2. SEO Improvements

**File: `index.html`**
- Add missing `<link rel="canonical" href="https://jobbot2026.lovable.app/" />`
- Add structured data (JSON-LD) for `SoftwareApplication` schema — name, description, offers, rating
- Add `robots` meta tag: `index, follow`
- Improve meta description to be more keyword-rich: include "AI resume builder", "cover letter generator", "job application portfolio"
- Add `og:url` meta tag

**File: `src/pages/Landing.tsx`**
- Add semantic HTML improvements: wrap hero `h1` content to include target keywords naturally
- Add `alt` text context to the example asset iframes (they're already titled, which is good)
- Add an FAQ section using `<details>`/accordion with keyword-rich Q&A (e.g., "What is an AI resume builder?", "How does ResuVibe compare to other resume tools?") — this targets featured snippets and long-tail queries

**File: `public/robots.txt`** — Verify it allows crawling (read first)

### Files to Change

| File | Change |
|---|---|
| `src/pages/Landing.tsx` | Add helpdesk email to footer; add FAQ section for SEO |
| `index.html` | Canonical URL, JSON-LD structured data, improved meta description, og:url, robots meta |
| `public/robots.txt` | Verify/update if needed |

