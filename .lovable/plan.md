# Plan: Remove Hardcoded Document Counts from Copy

## What Changes

Replace all hardcoded references to "6 documents" and "select exactly 3" with flexible language like "multiple documents" and "select your documents." This affects UI copy, AI prompts, comments, and toast messages — but NOT the functional logic (the AI can still return 6, users can still select 3 — those mechanics stay, just the user-facing text becomes count-agnostic).

## Files to Edit

### 1. `src/pages/Landing.tsx` (line 91)

- `"6 documents per application"` → `"Multiple documents per application"`

### 2. `src/pages/Applications.tsx` (line 470)

- `"6+ branded documents in minutes"` → `"Multiple branded documents in minutes"`

### 3. `src/components/AssetProposalCard.tsx`

- Comment line 2: `"Shows 6 AI-proposed document types, lets user select exactly 3"` → `"Shows AI-proposed document types for user selection"`
- Line 106: `"propose 6 professional documents"` → `"propose professional documents"`
- Line 59 toast: `"Select 3 document types to generate."` → `"Select the document types you'd like to generate."`
- Line 75 toast: `"You can select exactly 3 documents."` → `"You've reached the selection limit."`
- &nbsp;
- Line 90 toast: `"Generating your 3 documents..."` → `"Generating your selected documents..."`
- Line 122 title: `"Select 3 Document Types"` → `"Select Document Types"`
- Line 123 badge: `"{selected.size}/3 selected"` → keep the dynamic count but remove the "/3" hardcode — use a constant or just show `"{selected.size} selected"`
- Line 125: `"Choose exactly 3 documents"` → `"Choose which documents to generate for this application."`

### 4. `src/lib/api/dynamicAssets.ts` (line 64)

- Comment: `"Propose 6 asset types via AI"` → `"Propose portfolio doc types via AI"`

### 5. `supabase/functions/propose-assets/index.ts`

- System prompt (line 48): Replace `"identify exactly SIX (6) distinct"` → `"identify several distinct"` (keep the rest of the prompt intact)
- User prompt (line 50): `"suggest 6 professional document types"` → `"suggest professional document types"`

### 6. `src/components/ChangeAssetDialog.tsx` — no hardcoded counts, no changes needed.

## What Stays the Same

- The `selected.size < 3` and `selected.size !== 3` logic in `AssetProposalCard` stays — the functional limit is fine, just the user-facing copy becomes generic. If the marketing team wants to change the actual limit later, they change one constant.