/**
 * Utility to inject a CSS-based watermark into HTML documents for free tier users.
 * Creates a diagonal repeating "ResuVibe" watermark at 20% opacity.
 */

const WATERMARK_CSS = `
  body {
    position: relative;
  }
  body::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    width: 200vw;
    height: 200vh;
    pointer-events: none;
    z-index: 9999;
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 80px,
      rgba(0, 0, 0, 0.03) 80px,
      rgba(0, 0, 0, 0.03) 81px
    ),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='100' viewBox='0 0 300 100'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='24' font-weight='bold' fill='%23000000' opacity='0.08' transform='rotate(-35 150 50)'%3EResuVibe%3C/text%3E%3C/svg%3E");
    background-repeat: repeat;
    background-size: 300px 100px;
    transform: translate(-25%, -25%);
  }
  @media print {
    body::before {
      position: absolute;
      width: 300%;
      height: 300%;
    }
  }
`;

/**
 * Injects watermark CSS into an HTML document string.
 * Handles both full HTML documents and HTML fragments.
 */
export function injectWatermark(html: string): string {
  if (!html || typeof html !== 'string') return html;

  const styleTag = `<style data-watermark="resuvibe">${WATERMARK_CSS}</style>`;

  // If it has a <head> tag, inject there
  if (html.includes('</head>')) {
    return html.replace('</head>', `${styleTag}</head>`);
  }

  // If it has <html> but no <head>, create a head
  if (html.includes('<html')) {
    return html.replace(/(<html[^>]*>)/i, `$1<head>${styleTag}</head>`);
  }

  // If it's a fragment starting with <body> or just content, wrap appropriately
  if (html.includes('<body')) {
    return html.replace(/(<body[^>]*>)/i, `<head>${styleTag}</head>$1`);
  }

  // For plain HTML fragments, prepend the style
  return `${styleTag}${html}`;
}

/**
 * Removes watermark from HTML (used when tier upgrades)
 */
export function removeWatermark(html: string): string {
  if (!html || typeof html !== 'string') return html;
  return html.replace(/<style data-watermark="resuvibe">[\s\S]*?<\/style>/gi, '');
}
