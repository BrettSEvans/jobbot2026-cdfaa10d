

# Red Warning Border on Blocked Site Alert & Preserve Job URL

## Changes

### 1. `src/pages/NewApplication.tsx` — Alert styling + show original URL

**Alert styling** (line ~214-219): Change the `<Alert>` to use `variant="destructive"` with a thick red border:
```tsx
<Alert variant="destructive" className="border-2 border-destructive">
```

**Show original job link** below the alert when in manual mode and a jobUrl exists — add after the Alert block:
```tsx
{useManualInput && jobUrl.trim() && (
  <p className="text-xs text-muted-foreground">
    Original job link:{" "}
    <a href={jobUrl.startsWith("http") ? jobUrl : `https://${jobUrl}`}
       target="_blank" rel="noopener noreferrer"
       className="text-primary underline underline-offset-2 break-all">
      {jobUrl}
    </a>
  </p>
)}
```

The `jobUrl` is already passed to `backgroundGenerator.startFullGeneration` (line 132) and stored as `job_url` on the application record, so DetailsTab already displays it as a clickable link on the final job page (line 57). No backend changes needed.

### Net effect
- Blocked-site alert gets a prominent red destructive border so users immediately understand why they're in paste mode
- The original job URL stays visible during manual paste and is saved to the application record
- The application detail page already shows the job URL — no changes needed there

