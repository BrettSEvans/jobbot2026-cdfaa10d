## Summary
Remove the responsive `hidden md:table-cell` class from the **Created** column on the Applications list table so the creation date is visible at all screen widths (including the user's laptop viewport). The **Updated** column will keep its current hidden-on-small-screens behavior to avoid clutter.

## Changes
- `src/pages/Applications.tsx`
  - **Table header** (`TableHead` for `created_at`): remove `hidden md:table-cell`
  - **Table cell** (`TableCell` displaying `new Date(app.created_at).toLocaleDateString()`): remove `hidden md:table-cell`

No database or API changes are needed — `created_at` is already queried and rendered.