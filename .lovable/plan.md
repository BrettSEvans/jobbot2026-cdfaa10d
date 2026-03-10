

# Add Campaign Creator with Trackable Links

## How it works

Admins/marketing users create a campaign by providing a name, source, and medium. The system generates a tracking URL (e.g., `https://jobbot2026.lovable.app/?utm_source=twitter&utm_medium=social&utm_campaign=spring2026`). When users visit via that link, the existing `captureAttribution` utility already captures the UTM params and saves them to `profiles.referral_source`. The campaign table just stores the definitions so you can manage and track them.

## Changes

### 1. Database: New `campaigns` table

```sql
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  utm_source text NOT NULL DEFAULT '',
  utm_medium text NOT NULL DEFAULT '',
  utm_campaign text NOT NULL,
  utm_content text DEFAULT '',
  utm_term text DEFAULT '',
  ref_code text DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Admin + Marketing can manage campaigns
CREATE POLICY "Admin/marketing can manage campaigns" ON public.campaigns
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'marketing'::app_role]))
  WITH CHECK (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'marketing'::app_role]));
```

### 2. Update `AdminCampaignsTab.tsx`

Add a "Create Campaign" card/dialog at the top with fields:
- **Name** (label, e.g. "Spring LinkedIn Push")
- **Source** (e.g. linkedin, twitter, email)
- **Medium** (e.g. social, cpc, newsletter)
- **Campaign slug** (auto-generated from name, editable)
- **Content** and **Term** (optional)
- **Ref code** (optional)

On save, insert into `campaigns` table and display the generated tracking URL with a copy button. The URL is built as:
```
https://jobbot2026.lovable.app/?utm_source=...&utm_medium=...&utm_campaign=...
```

Add a "Your Campaigns" section showing all created campaigns in a table with columns: Name, Link (with copy button), Signups (count matched from profiles), Created date. Signups are counted by matching `profiles.referral_source->utm_campaign` against the campaign's `utm_campaign` value.

### 3. No changes needed to attribution capture

The existing `captureAttribution()` in `marketingAttribution.ts` already reads all UTM params from the URL and persists them. No modifications required.

### Net effect
- 1 new database table with RLS
- ~150 lines added to `AdminCampaignsTab.tsx` (create form + campaigns list with signup counts)
- Fully integrated with existing attribution pipeline

