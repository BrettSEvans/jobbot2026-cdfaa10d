/**
 * HTML shell template for the dashboard.
 * Supports both inline mode (for iframe srcDoc) and external mode (for ZIP files).
 */

export interface ShellOptions {
  title: string;
  inlineCss?: string;
  inlineJs?: string;
  inlineData?: string;
  externalCss?: string;
  externalJs?: string;
  externalData?: string;
}

export function getShellHtml(options: ShellOptions): string {
  const {
    title,
    inlineCss,
    inlineJs,
    inlineData,
    externalCss,
    externalJs,
    externalData,
  } = options;

  const cssBlock = inlineCss
    ? `<style>${inlineCss}</style>`
    : `<link rel="stylesheet" href="${externalCss}">`;

  const dataBlock = inlineData
    ? `<script>window.__DASHBOARD_DATA__=${inlineData};<\/script>`
    : `<script src="${externalData}"><\/script>`;

  const jsBlock = inlineJs
    ? `<script>${inlineJs}<\/script>`
    : `<script src="${externalJs}"><\/script>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&display=swap">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
  ${cssBlock}
</head>
<body>
  <div id="sidebar">
    <div id="sidebar-header"></div>
    <nav id="sidebar-nav"></nav>
  </div>
  <div id="main-wrapper">
    <header id="top-bar">
      <button id="hamburger-btn" aria-label="Toggle menu">
        <span class="material-icons-outlined">menu</span>
      </button>
      <h1 id="page-title"></h1>
    </header>
    <main id="main-content"></main>
  </div>
  <div id="drilldown-overlay" class="overlay hidden"></div>
  <div id="toast-container"></div>
  ${dataBlock}
  ${jsBlock}
</body>
</html>`;
}
