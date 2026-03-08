## Rename "Refine with AI" to "Vibe Edit" + Add Contextual Prompt Help

### Overview

Rename all "Refine with AI" buttons to "Vibe Edit" across every asset type. Add a small info icon button next to each Vibe Edit button that opens a popover with asset-specific prompt-writing guidance and examples. Also add a Vibe Edit + refine chat to the Cover Letter tab (which currently lacks one).

&nbsp;

Confirm that user help docs are appropriately updated.

&nbsp;

&nbsp;

### Changes

**1. New Component: `src/components/VibeEditInfo.tsx**`

- Small `Info` icon button that triggers a `Popover`
- Accepts `assetType` prop to render contextual help
- Contains a map of prompt-writing tips per asset type:
  - **Dashboard**: example referencing KPI tables, chart modifications
  - **Cover Letter**: example referencing tone, paragraph focus, company values
  - **Resume**: example referencing skills section, experience bullet points, keyword optimization
  - **Executive Report**: example referencing executive summary table, risk sections
  - **RAID Log**: example referencing risk rows, action items, dependencies
  - **Architecture Diagram**: example referencing system components, data flow
  - **Roadmap**: example referencing milestones, timeline, deliverables
  - **Dynamic assets**: generic guidance with role/outcomes/design framework
- Each tip follows a structure: Role, Outcome, Design/Detail, Example prompt

**2. `src/components/tabs/HtmlAssetTab.tsx**`

- Rename button text: "Refine with AI" → "Vibe Edit", "Hide Chat" stays
- Import and render `<VibeEditInfo assetType={assetType} />` next to the button
- Update "Upgrade to Refine" → "Upgrade to Vibe Edit"

**3. `src/components/DynamicAssetTab.tsx**`

- Same rename: "Refine with AI" → "Vibe Edit"
- Add `<VibeEditInfo assetType="dynamic" />` next to button
- Update locked/upgrade text accordingly

**4. `src/components/tabs/CoverLetterTab.tsx**`

- Add a "Vibe Edit" button + chat textarea (similar to HtmlAssetTab's refine chat)
- The chat sends refinement via a streaming call to `tailor-cover-letter` with the user's message
- Add `<VibeEditInfo assetType="cover_letter" />` next to the button

**5. Minor text updates**

- `src/components/StylePreferencesCard.tsx`: "Refine with AI" → "Vibe Edit"
- `src/pages/Landing.tsx`: "refine with AI chat" → "vibe edit with AI chat"
- `src/pages/Applications.tsx`: "Refine with AI chat" → "Vibe Edit with AI chat"
- `src/pages/TutorialDemo.tsx`: "Refine with AI" → "Vibe Edit"

### Files


| File                                      | Change                               |
| ----------------------------------------- | ------------------------------------ |
| `src/components/VibeEditInfo.tsx`         | New — contextual prompt help popover |
| `src/components/tabs/HtmlAssetTab.tsx`    | Rename button, add info popover      |
| `src/components/DynamicAssetTab.tsx`      | Rename button, add info popover      |
| `src/components/tabs/CoverLetterTab.tsx`  | Add Vibe Edit chat + info popover    |
| `src/components/StylePreferencesCard.tsx` | Text update                          |
| `src/pages/Landing.tsx`                   | Text update                          |
| `src/pages/Applications.tsx`              | Text update                          |
| `src/pages/TutorialDemo.tsx`              | Text update&nbsp;&nbsp;&nbsp;     |
