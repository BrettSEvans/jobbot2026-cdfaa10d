/**
 * DOCX export utility — calls the export-docx edge function.
 */
import { supabase } from '@/integrations/supabase/client';

/**
 * Build a safe filename for DOCX export.
 */
export function buildDocxFilename(
  assetType: string,
  companyName?: string,
  jobTitle?: string,
): string {
  const parts = [assetType];
  if (companyName) parts.push(companyName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase());
  if (jobTitle) parts.push(jobTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase());
  return `${parts.join('-')}.docx`;
}

/**
 * Download HTML content as a DOCX file.
 */
export async function downloadHtmlAsDocx(
  html: string,
  filename: string,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-docx`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ html, filename, assetType: filename.split('-')[0] }),
    }
  );

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || `DOCX export failed (${resp.status})`);
  }

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
