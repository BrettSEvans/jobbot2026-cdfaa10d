import { marked } from "marked";

/**
 * Detect if a string already contains HTML tags.
 */
function isHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Convert cover letter body (markdown or HTML) to HTML string.
 * Exported so the WYSIWYG editor can initialise from stored content.
 */
export function coverLetterBodyToHtml(text: string): string {
  if (!text) return "";
  if (isHtml(text)) return text;
  return marked.parse(text, { async: false }) as string;
}

/**
 * Generates a print-ready cover letter in a hidden iframe and triggers
 * the browser's Save-as-PDF dialog via window.print().
 */
export function buildCoverLetterHtml(
  coverLetter: string,
  companyName: string,
  jobTitle: string,
  applicantName?: string,
  headerOverride?: string,
  footerOverride?: string,
): string {
  const name = headerOverride?.split("\n")[0]?.trim() || applicantName || "Your Name";
  const subtitle = headerOverride?.split("\n").slice(1).join(" · ").trim() || "";
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const bodyHtml = coverLetterBodyToHtml(coverLetter);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Cover Letter</title>
<style>
  @page {
    size: letter;
    margin: 0;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    height: 100%;
  }
  @media print {
    html, body { overflow: hidden; }
  }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    max-height: 100vh;
    padding: 0.75in 1in;
  }
  .header {
    margin-bottom: 20pt;
    border-bottom: 1.5pt solid #2a2a2a;
    padding-bottom: 10pt;
  }
  .header .name {
    font-size: 16pt;
    font-weight: 700;
    letter-spacing: 0.5pt;
    color: #111;
  }
  .header .date {
    margin-top: 4pt;
    font-size: 9.5pt;
    color: #555;
  }
  .recipient {
    margin-bottom: 16pt;
    font-size: 10pt;
    color: #333;
  }
  .body p {
    margin-bottom: 8pt;
    text-align: justify;
  }
  .body table {
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0;
    font-size: 9.5pt;
  }
  .body th, .body td {
    border: 0.75pt solid #ccc;
    padding: 4pt 6pt;
    text-align: left;
  }
  .body th {
    background: #f5f5f5;
    font-weight: 700;
  }
  .body strong { font-weight: 700; }
  .body em { font-style: italic; }
  .body ul, .body ol { margin: 6pt 0 6pt 18pt; }
  .body li { margin-bottom: 3pt; }
  .signature {
    margin-top: 24pt;
  }
  .signature .closing {
    margin-bottom: 22pt;
  }
  .signature .sig-name {
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="name">${escapeHtml(name)}</div>
    ${subtitle ? `<div class="date">${escapeHtml(subtitle)}</div>` : ""}
    <div class="date">${date}</div>
  </div>
  <div class="recipient">
    ${escapeHtml(companyName)}${jobTitle ? `<br/>${escapeHtml(jobTitle)}` : ""}
  </div>
  <div class="body">
    ${bodyHtml}
  </div>
  <div class="signature">
    <div class="closing">Sincerely,</div>
    <div class="sig-name">${escapeHtml(name)}</div>
  </div>
  ${footerOverride ? `<div style="margin-top:18pt;font-size:8.5pt;color:#888;border-top:0.5pt solid #ccc;padding-top:6pt;">${escapeHtml(footerOverride)}</div>` : ""}
</body>
</html>`;
}

export function downloadCoverLetterPdf(
  coverLetter: string,
  companyName: string,
  jobTitle: string,
  applicantName?: string,
) {
  const html = buildCoverLetterHtml(coverLetter, companyName, jobTitle, applicantName);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "-9999px";
  iframe.style.top = "-9999px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  if (doc.readyState === "complete") {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 1000);
    }, 250);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
