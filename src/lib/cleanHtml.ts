/**
 * Clean streamed HTML output from LLMs.
 * Strips markdown fences and extracts the HTML document.
 */
export function cleanHtml(raw: string): string {
  let clean = raw.trim();
  clean = clean.replace(/^```(?:html)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  const htmlStart =
    clean.indexOf("<!DOCTYPE html>") !== -1
      ? clean.indexOf("<!DOCTYPE html>")
      : clean.indexOf("<!doctype html>");
  if (htmlStart > 0) clean = clean.slice(htmlStart);
  const htmlEnd = clean.lastIndexOf("</html>");
  if (htmlEnd !== -1) clean = clean.slice(0, htmlEnd + 7);
  return clean;
}
