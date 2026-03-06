

## Rebrand: JobBot → ResuVibe

Three files to update:

**1. `src/lib/branding.ts`** — Update `name` to `"ResuVibe"`, `twitter` to `"@ResuVibe"`, `storagePrefix` to `"resuvibe"`

**2. `index.html`** — Replace all static "JobBot" references in meta tags with "ResuVibe"

**3. `docs/ADMIN_GUIDE.md`** — Search-replace "JobBot" → "ResuVibe"

**4. `docs/CHROME_EXTENSION.md`** — Search-replace "JobBot" → "ResuVibe"

All other UI references flow from `branding.ts` automatically.

