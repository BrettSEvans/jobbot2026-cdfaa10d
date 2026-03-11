

## Mobile QA Report — Full Walkthrough

### Tested Viewports
- iPhone SE (320x568)
- iPhone X (375x812) 
- iPad (768x1024)

### Pages Tested
Landing, Pricing, Auth (sign-in + sign-up), Terms, Privacy, Cookie Policy, Reset Password, Verify Email, 404, Admin (unauthenticated)

---

### BUG FOUND: `/search-jobs` route broken for authenticated users

**Severity: High**

In `src/App.tsx` line 149:
```typescript
<Route path="/search-jobs" element={<Navigate to="/" replace />} />
```

The `SearchJobs` component is imported (line 30) but never rendered. The route silently redirects to `/`. Meanwhile, the hamburger menu in `AppHeader.tsx` includes a "Search Jobs" link pointing to `/search-jobs`. Authenticated users who tap "Search Jobs" in the mobile menu get redirected home with no feedback — a dead-end feature.

**Fix**: Change line 149 to render the actual page:
```typescript
<Route path="/search-jobs" element={<><AppHeader onSignOut={signOut} /><main id="main-content"><SearchJobs /></main></>} />
```

---

### WARNING: Console ref warning in Landing page

`CtaFooter` component (Landing.tsx:1212) triggers a React warning: "Function components cannot be given refs." Non-breaking but should be addressed with `React.forwardRef`.

---

### Passed Tests (No Issues)

| Area | Result |
|------|--------|
| Landing hero layout (320-768px) | Text wraps cleanly, no overflow |
| Landing hamburger menu | Opens/closes, shows Sign In + Start Free Trial |
| Landing "See Pricing" button | Smooth scrolls to pricing section |
| Landing "Start Your Free Trial" CTA | Navigates to /auth |
| Landing mockup images | Scale correctly, no overflow |
| Landing footer links | Terms, Privacy, Cookie Policy all work |
| Cookie consent banner | Dismisses correctly, doesn't block CTAs |
| Pricing page mobile layout | Cards stack vertically, all tiers visible |
| Auth page — sign in form | HTML5 validation prevents empty submission |
| Auth page — sign up toggle | Switches to "Create your account" with 7-day trial copy |
| 404 page | Renders correctly with "Return to Home" link |
| Terms / Privacy / Cookie Policy | All render with back button, proper typography |
| Reset Password (no token) | Shows "Link expired" gracefully |
| Touch targets | 44px minimum on all nav items |
| Tablet (768px) breakpoint | Desktop nav shows correctly, no hamburger |
| Admin route (unauthenticated) | Shows 404 (correct — no auth redirect leak) |
| Z-index layering | Sheet (z-50) properly overlays cookie banner (z-40) and help button (z-40) |

---

### Recommended Fix

One code change in `src/App.tsx` line 149 to fix the `/search-jobs` dead route. This is the only blocking bug found.

