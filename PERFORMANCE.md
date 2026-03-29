# Performance Baseline

Measured 2026-03-29 from US-West (SJC) against https://www.resuvibe.ai

## HTML/TTFB (10 samples, curl)

| Metric | Value |
|--------|-------|
| p50    | 121ms |
| p95    | 160ms |
| TTFB   | ~108ms |

## Asset sizes

| Asset | Compressed size |
|-------|----------------|
| Main JS bundle (`index-DPBU01d4.js`) | 623 KB (gzip) |

## Notes

- Served via Cloudflare CDN
- SPA — actual LCP/FID/CLS require browser measurement (Lighthouse or WebPageTest)
- The 623 KB JS bundle is the primary load concern; acceptable for beta, worth splitting before public launch
- Next measurement should use [WebPageTest](https://www.webpagetest.org) for full Core Web Vitals
