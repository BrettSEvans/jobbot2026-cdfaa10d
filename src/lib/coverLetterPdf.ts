/**
 * Generates a print-ready cover letter in a hidden iframe and triggers
 * the browser's Save-as-PDF dialog via window.print().
 */
export function downloadCoverLetterPdf(
  coverLetter: string,
  companyName: string,
  jobTitle: string,
  applicantName?: string,
) {
  const name = applicantName || "Your Name";
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Split cover letter into paragraphs, preserving blank-line breaks
  const paragraphs = coverLetter
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, "<br/>"))
    .map((p) => `<p>${p}</p>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Cover Letter – ${companyName} – ${jobTitle}</title>
<style>
  @page {
    size: letter;
    margin: 1in 1.15in;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11.5pt;
    line-height: 1.55;
    color: #1a1a1a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header {
    margin-bottom: 28pt;
    border-bottom: 1.5pt solid #2a2a2a;
    padding-bottom: 14pt;
  }
  .header .name {
    font-size: 18pt;
    font-weight: 700;
    letter-spacing: 0.5pt;
    color: #111;
  }
  .header .date {
    margin-top: 6pt;
    font-size: 10pt;
    color: #555;
  }
  .recipient {
    margin-bottom: 20pt;
    font-size: 10.5pt;
    color: #333;
  }
  .body p {
    margin-bottom: 10pt;
    text-align: justify;
  }
  .signature {
    margin-top: 32pt;
  }
  .signature .closing {
    margin-bottom: 28pt;
  }
  .signature .sig-name {
    font-weight: 700;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="name">${escapeHtml(name)}</div>
    <div class="date">${date}</div>
  </div>
  <div class="recipient">
    ${escapeHtml(companyName)}${jobTitle ? `<br/>${escapeHtml(jobTitle)}` : ""}
  </div>
  <div class="body">
    ${paragraphs}
  </div>
  <div class="signature">
    <div class="closing">Sincerely,</div>
    <div class="sig-name">${escapeHtml(name)}</div>
  </div>
</body>
</html>`;

  // Create hidden iframe, print, then clean up
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

  // Wait for fonts / styles then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Clean up after dialog closes
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  // Fallback if onload already fired (some browsers)
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
