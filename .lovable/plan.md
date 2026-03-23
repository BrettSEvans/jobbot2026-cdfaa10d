

## Standardize Download Filenames to `firstname.lastname_doctype_companyname`

### Problem
Downloads currently use inconsistent naming like `ats-resume-companyname-jobtitle.docx` or `companyname-assetslug.pdf`. The user wants a unified convention: `firstname.lastname_doctype_companyname`.

### Approach
Create a shared utility function for filename generation, then update all download call sites across three files.

### 1. Create filename utility — `src/lib/fileNaming.ts`
```typescript
export function buildFileName(
  firstName: string | null,
  lastName: string | null,
  docType: string,
  companyName: string | null,
  extension: string
): string {
  const name = [firstName, lastName].filter(Boolean).join(".").toLowerCase() || "document";
  const doc = docType.replace(/\s+/g, "-").toLowerCase();
  const company = (companyName || "company").replace(/\s+/g, "-").toLowerCase();
  return `${name}_${doc}_${company}.${extension}`;
}
// Example: "john.smith_ats-resume_acme-corp.docx"
```

### 2. Update ResumeTab — pass `userProfile` prop
- Add `userProfile` to `ResumeTabProps` (already available in `useApplicationDetail`)
- Update DOCX download filename: `buildFileName(first, last, `${variant}-resume`, companyName, "docx")`
- Update PDF print title similarly (PDF names are browser-controlled via print dialog, but we can set the document title)

### 3. Update CoverLetterTab — already has `userProfile`
- Update DOCX download: `buildFileName(first, last, "cover-letter", companyName, "docx")`
- Update PDF `<title>` tag to use same convention

### 4. Update DynamicMaterialsSection — already has `candidateName`
- Parse `candidateName` into first/last, or query `first_name`/`last_name` separately
- Update `downloadMaterialPdf` call: `buildFileName(first, last, assetName, companyName, "pdf")`
- Update `downloadHtmlFile` for dashboard: `buildFileName(first, last, "dashboard", companyName, "html")`
- Update legacy asset downloads similarly

### Files Modified
| File | Change |
|------|--------|
| `src/lib/fileNaming.ts` | New — shared naming utility |
| `src/components/tabs/ResumeTab.tsx` | Add `userProfile` prop, use `buildFileName` for DOCX/PDF |
| `src/components/tabs/CoverLetterTab.tsx` | Use `buildFileName` for DOCX/PDF |
| `src/components/DynamicMaterialsSection.tsx` | Use `buildFileName` for all material downloads |
| `src/pages/ApplicationDetail.tsx` | Pass `userProfile` to `ResumeTab` |

