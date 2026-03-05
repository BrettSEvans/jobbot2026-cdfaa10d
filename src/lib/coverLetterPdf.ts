/**
 * Generates a print-ready cover letter in a hidden iframe and triggers
 * the browser's Save-as-PDF dialog via window.print().
 */
export function buildCoverLetterHtml(
  coverLetter: string,
  companyName: string,
  jobTitle: string,
  applicantName?: string,
): string {
  const name = applicantName || "Your Name";
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paragraphs = coverLetter
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, "<br/>"))
    .map((p) => `<p>${p}</p>`)
    .join("\n");

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
    overflow: hidden;
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
