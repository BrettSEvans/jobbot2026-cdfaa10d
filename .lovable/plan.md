

## Fix Department Detection & Validation

### Problem
1. `department` comes from `analyze-company` edge function, which is biased toward "Sales, Marketing, GTM" examples
2. `jdIntelligence.department` (from `parse-job-description`) is a more authoritative source but is **never used** for dashboard generation
3. The `generate-dashboard` edge function has hardcoded fallbacks: `department || 'GTM'` and `department || 'GTM / Sales / Marketing'`
4. The validator doesn't check for department mismatch

### Changes

**1. `src/lib/backgroundGenerator.ts` — Prefer JD intelligence department**

After JD intelligence is parsed (line ~209), override the `department` variable with `jdIntelligence.department` when available:

```typescript
// After jdIntelligence is parsed:
if (jdIntelligence?.department) {
  department = jdIntelligence.department;
}
```

This ensures the more structured, authoritative JD parse takes precedence over the company analyzer's guess.

**2. `supabase/functions/generate-dashboard/index.ts` — Remove GTM fallbacks**

- Line 186: Change `department || 'GTM'` → `department || 'General'`
- Line 202: Change `department || 'GTM / Sales / Marketing'` → `department || 'Not specified'`

These neutral fallbacks prevent the LLM from being biased toward sales/marketing when the department is unknown.

**3. `src/lib/dashboard/jdAlignmentValidator.ts` — Add department mismatch check**

Add a validation step that compares `data.meta.department` against `jdIntelligence.department` and `jdIntelligence.job_function`. If neither matches, flag a warning gap:

```typescript
// Department mismatch check
if (jdIntelligence.department) {
  const dashDept = normalize(data.meta.department || "");
  const jdDept = normalize(jdIntelligence.department);
  if (dashDept && !textContainsKeyword(dashDept, jdDept) && !textContainsKeyword(jdDept, dashDept)) {
    gaps.push({
      type: "structural",
      severity: "warning",
      message: `Dashboard department "${data.meta.department}" doesn't match JD department "${jdIntelligence.department}"`,
    });
  }
}
```

**4. `supabase/functions/analyze-company/index.ts` — Broaden department examples**

Update the prompt example from `"Sales, Marketing, GTM, Operations, etc."` to `"e.g. Engineering, Product, Finance, HR, Sales, Marketing, Operations, Legal, etc."` to reduce bias.

### Summary of flow after fix

```text
analyze-company → department (initial guess)
parse-job-description → jdIntelligence.department (authoritative)
                         ↓ overrides department if present
generate-dashboard ← uses JD-derived department (neutral fallback if missing)
jdAlignmentValidator ← checks dashboard meta.department matches JD department
```

