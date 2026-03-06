/**
 * Layout Style Registry — assigns distinct visual layouts to dynamic assets
 * so each document within an application looks different, showcasing breadth.
 */

export interface LayoutStyle {
  id: string;
  name: string;
  cssGuidance: string;
  structureGuidance: string;
}

export const LAYOUT_STYLES: LayoutStyle[] = [
  {
    id: 'executive-brief',
    name: 'Executive Brief',
    cssGuidance: `Use a clean single-column layout. Start with a bold full-width header bar using the primary brand color with white text. Use large pull-quote callout boxes with a left colored border (4px solid accent color) and light background for key insights. Avoid heavy tables — use short bullet lists instead. Keep generous whitespace (padding: 24px 32px). Use a subtle bottom border on section headings. Typography should be large and airy (headings 20-24px, body 13px, line-height 1.7).`,
    structureGuidance: `Structure: Full-width colored header bar → Executive summary paragraph → 2-3 sections each with a bold heading, a short narrative paragraph, and an optional pull-quote callout box. End with a "Key Takeaways" section using a numbered list. No tables. Use <blockquote> styled elements for callouts.`,
  },
  {
    id: 'data-grid',
    name: 'Data Grid',
    cssGuidance: `Lead with a row of 3-4 KPI metric cards at the top using CSS flexbox (gap: 12px). Each card has a large number (font-size: 28px, font-weight: 700), a small label below (font-size: 11px, text-transform: uppercase, letter-spacing: 1px), and a subtle box-shadow. Use alternating row colors (#f9fafb / white) on tables. Table headers should use the primary brand color background with white text. Borders should be light (#e5e7eb). Keep the layout dense and data-focused.`,
    structureGuidance: `Structure: Compact header with title + date → Row of 3-4 KPI cards in a flex container → One or two well-formatted data tables with column headers, alternating row stripes, and right-aligned numbers. Use <table> with proper <thead>/<tbody>. End with a brief analysis paragraph.`,
  },
  {
    id: 'magazine',
    name: 'Magazine',
    cssGuidance: `Use a two-column CSS Grid layout (grid-template-columns: 1fr 280px) with a 24px gap. The left column contains the main narrative body text. The right column is a sidebar with metric highlight boxes (colored background cards stacked vertically). Use a large, bold title (font-size: 26px) spanning both columns. Body text should be well-typeset (font-size: 13px, line-height: 1.8, text-align: justify). Sidebar cards use the accent color as background with white text. Add a thin top border (3px) in the primary color.`,
    structureGuidance: `Structure: Full-width title with thin colored top border → CSS Grid with two columns → Left column: 3-4 narrative sections with subheadings → Right sidebar: 4-5 stacked metric/highlight cards (each with a label and value), plus a "Quick Facts" list. Use <aside> for the sidebar. The layout should feel editorial.`,
  },
  {
    id: 'timeline',
    name: 'Timeline',
    cssGuidance: `Create a vertical timeline using a 2px solid line in the primary color running down the left side (margin-left: 20px). Each milestone is a flex row with a colored circle node (width: 14px, height: 14px, border-radius: 50%) on the timeline, and content to the right. Alternate milestone cards between white and a very light tint of the primary color. Status indicators use colored dots: green (#22c55e) for complete, amber (#f59e0b) for in-progress, gray (#9ca3af) for planned. Header should be clean and minimal.`,
    structureGuidance: `Structure: Clean header with title and date range → Vertical timeline with 5-7 milestone entries → Each milestone has: a timeline node (colored circle), a phase name (bold), date/timeframe, 2-3 bullet points of deliverables, and a status indicator badge. End with a "Next Steps" summary box with a dashed border.`,
  },
  {
    id: 'scorecard',
    name: 'Scorecard',
    cssGuidance: `Use a CSS Grid of cards (grid-template-columns: repeat(2, 1fr) or repeat(3, 1fr), gap: 16px). Each card has a header strip in the primary color, a metric name, a visual progress bar (height: 8px, border-radius: 4px, background: #e5e7eb with a colored fill), and a score or percentage. Use RAG status colors: Red (#ef4444), Amber (#f59e0b), Green (#22c55e) for the progress bar fill based on the score. Cards should have rounded corners (border-radius: 8px) and subtle shadows. Keep the overall layout compact and scannable.`,
    structureGuidance: `Structure: Header with title and overall score/grade → 2x3 or 3x2 grid of scorecard cells → Each cell: category label, score value (large text), progress bar, brief 1-line assessment. Below the grid: a "Summary & Recommendations" section with 3-4 bullet points. Use <div> grid, not tables.`,
  },
  {
    id: 'infographic',
    name: 'Infographic',
    cssGuidance: `Visual-heavy layout using icon-paired sections. Each section has a large emoji or unicode symbol (font-size: 28px) on the left and content on the right in a flex row. Use horizontal stat bars (width-based, not table-based) with rounded corners and brand colors for visual impact. Section dividers use a dotted border (border-top: 2px dotted #e5e7eb). Use a bold centered title with a colored underline decoration. Numbers should be displayed large (font-size: 32px, font-weight: 800) with small labels. Background can use very subtle colored sections alternating white and a light tint.`,
    structureGuidance: `Structure: Centered bold title with decorative underline → 2-3 large stat blocks (big number + label, flex row) → 3-4 icon-paired content sections (emoji/icon left, heading + 2-3 bullets right) → Horizontal bar chart section showing 3-5 metrics as styled bars with labels and percentages → Footer callout box with key message. Use flex layouts throughout, no tables.`,
  },
];

/**
 * Deterministically assign a different layout style to each asset name.
 * Uses a simple hash to pick a starting index, then round-robins to avoid duplicates.
 */
export function assignLayoutStyles(assetNames: string[]): Record<string, LayoutStyle> {
  const result: Record<string, LayoutStyle> = {};
  const pool = [...LAYOUT_STYLES];

  // Simple string hash
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  };

  // Sort asset names for determinism
  const sorted = [...assetNames].sort();
  const startIdx = hash(sorted.join('|')) % pool.length;

  sorted.forEach((name, i) => {
    const styleIdx = (startIdx + i) % pool.length;
    result[name] = pool[styleIdx];
  });

  return result;
}

/**
 * Get the layout style for a specific asset given its siblings.
 */
export function getLayoutStyleForAsset(
  assetName: string,
  allAssetNames: string[],
): LayoutStyle {
  const assignments = assignLayoutStyles(allAssetNames);
  return assignments[assetName] || LAYOUT_STYLES[0];
}
