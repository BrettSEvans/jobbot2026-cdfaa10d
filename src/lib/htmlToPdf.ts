/**
 * Generic HTML-to-PDF export using hidden iframe + browser print dialog.
 * Same approach as coverLetterPdf.ts but works with any HTML content.
 */
export function downloadHtmlAsPdf(
  html: string,
  filename: string,
) {
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

  // Inject print-friendly overrides into the HTML
  const printStyles = `<style media="print">
    @page { size: auto; margin: 0; }
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      padding: 0.5in;
    }
  </style>`;
  
  // Insert print styles before </head> or at the start
  let printHtml = html;
  if (printHtml.includes("</head>")) {
    printHtml = printHtml.replace("</head>", `${printStyles}</head>`);
  } else {
    printHtml = printStyles + printHtml;
  }

  // Set document title for the PDF filename hint
  if (printHtml.includes("<title>")) {
    printHtml = printHtml.replace(/<title>[^<]*<\/title>/, `<title>${filename}</title>`);
  }

  doc.open();
  doc.write(printHtml);
  doc.close();

  const triggerPrint = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch {}
      }, 1000);
    }, 400);
  };

  iframe.onload = triggerPrint;

  // Fallback if onload already fired
  if (doc.readyState === "complete") {
    triggerPrint();
  }
}

/** Build a sanitized filename from asset type, company, and job title */
export function buildPdfFilename(
  assetType: string,
  companyName?: string,
  jobTitle?: string,
): string {
  const parts = [
    assetType,
    companyName || "export",
    jobTitle || "",
  ]
    .filter(Boolean)
    .map((s) => s.replace(/\s+/g, "-").toLowerCase());
  return parts.join("-") + ".pdf";
}
