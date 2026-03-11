const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { html, filename, assetType } = await req.json();

    if (!html) {
      return new Response(
        JSON.stringify({ error: "html is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (html.length > 512_000) {
      return new Response(
        JSON.stringify({ error: "Input HTML exceeds 500KB limit", code: "SIZE_LIMIT" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract body content and strip non-visible blocks
    const bodyContent = extractBody(html);
    const cleaned = stripNonVisibleBlocks(bodyContent);

    // Convert HTML to OOXML paragraphs
    const paragraphs = htmlToOoxml(cleaned);
    const documentXml = buildDocumentXml(paragraphs);
    const stylesXml = buildStylesXml();
    const numberingXml = buildNumberingXml();
    const docxBlob = await buildDocxZip(documentXml, stylesXml, numberingXml);

    const safeName = (filename || `${assetType || "document"}.docx`).replace(/[^a-zA-Z0-9._-]/g, "_");

    return new Response(docxBlob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch (err) {
    console.error("export-docx error:", err);
    return new Response(
      JSON.stringify({ error: err.message, code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/* ── HTML Pre-processing ── */

function extractBody(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

function stripNonVisibleBlocks(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

/* ── HTML → OOXML Conversion ── */

interface RunProps {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number; // half-points
  color?: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "\u2019")
    .replace(/&lsquo;/gi, "\u2018")
    .replace(/&rdquo;/gi, "\u201D")
    .replace(/&ldquo;/gi, "\u201C")
    .replace(/&mdash;/gi, "\u2014")
    .replace(/&ndash;/gi, "\u2013")
    .replace(/&bull;/gi, "\u2022")
    .replace(/&#(\d+);/gi, (_m, code) => String.fromCharCode(Number(code)));
}

function makeRun(text: string, props: RunProps = {}): string {
  if (!text) return "";
  const rPr: string[] = [];
  if (props.bold) rPr.push("<w:b/>");
  if (props.italic) rPr.push("<w:i/>");
  if (props.underline) rPr.push('<w:u w:val="single"/>');
  if (props.fontSize) rPr.push(`<w:sz w:val="${props.fontSize}"/><w:szCs w:val="${props.fontSize}"/>`);
  if (props.color) rPr.push(`<w:color w:val="${props.color}"/>`);

  const rPrXml = rPr.length ? `<w:rPr>${rPr.join("")}</w:rPr>` : "";
  return `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(decodeEntities(text))}</w:t></w:r>`;
}

function makeParagraph(runs: string, styleId?: string, listLevel?: number, numId?: number): string {
  const pPr: string[] = [];
  if (styleId) pPr.push(`<w:pStyle w:val="${styleId}"/>`);
  if (listLevel !== undefined && numId !== undefined) {
    pPr.push(`<w:numPr><w:ilvl w:val="${listLevel}"/><w:numId w:val="${numId}"/></w:numPr>`);
  }
  const pPrXml = pPr.length ? `<w:pPr>${pPr.join("")}</w:pPr>` : "";
  return `<w:p>${pPrXml}${runs}</w:p>`;
}

/**
 * Simple recursive HTML-to-OOXML converter.
 * Uses regex-based tokenizer (no DOM available in Deno edge runtime).
 */
function htmlToOoxml(html: string): string {
  const result: string[] = [];
  processNodes(html, result, {}, null, 0);
  // If nothing produced, add empty paragraph
  if (result.length === 0) {
    result.push(makeParagraph(""));
  }
  return result.join("\n");
}

interface Context {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  headingLevel?: number;
  listType?: "bullet" | "number";
  listLevel?: number;
  inTable?: boolean;
}

function processNodes(
  html: string,
  output: string[],
  ctx: Context,
  _parentTag: string | null,
  depth: number,
): void {
  if (depth > 50) return; // safety

  // Tokenize into tags and text segments
  const tokens = tokenize(html);
  let pendingRuns: string[] = [];

  const flushRuns = (styleId?: string, listLevel?: number, numId?: number) => {
    if (pendingRuns.length > 0) {
      output.push(makeParagraph(pendingRuns.join(""), styleId, listLevel, numId));
      pendingRuns = [];
    }
  };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === "text") {
      const text = token.content.replace(/\s+/g, " ");
      if (text.trim()) {
        pendingRuns.push(makeRun(text, {
          bold: ctx.bold,
          italic: ctx.italic,
          underline: ctx.underline,
        }));
      }
      i++;
      continue;
    }

    if (token.type === "selfClosing") {
      const tag = token.tagName!.toLowerCase();
      if (tag === "br") {
        // Line break within a paragraph
        pendingRuns.push('<w:r><w:br/></w:r>');
      }
      // Skip <img>, <hr>, etc.
      i++;
      continue;
    }

    if (token.type === "open") {
      const tag = token.tagName!.toLowerCase();
      // Find matching close
      const inner = extractInnerContent(tokens, i);
      const innerHtml = inner.content;
      const nextI = inner.endIndex + 1;

      if (tag.match(/^h([1-6])$/)) {
        flushRuns();
        const level = parseInt(tag[1]);
        const headingRuns: string[] = [];
        collectRuns(innerHtml, headingRuns, { ...ctx, bold: true, headingLevel: level }, depth + 1);
        output.push(makeParagraph(headingRuns.join(""), `Heading${level}`));
      } else if (tag === "p" || tag === "div" || tag === "section" || tag === "article" || tag === "header" || tag === "footer" || tag === "main") {
        flushRuns();
        const blockRuns: string[] = [];
        collectRuns(innerHtml, blockRuns, ctx, depth + 1);
        if (blockRuns.length > 0) {
          output.push(makeParagraph(blockRuns.join("")));
        }
      } else if (tag === "ul") {
        flushRuns();
        processListItems(innerHtml, output, { ...ctx, listType: "bullet", listLevel: (ctx.listLevel ?? -1) + 1 }, depth + 1);
      } else if (tag === "ol") {
        flushRuns();
        processListItems(innerHtml, output, { ...ctx, listType: "number", listLevel: (ctx.listLevel ?? -1) + 1 }, depth + 1);
      } else if (tag === "table") {
        flushRuns();
        processTable(innerHtml, output, ctx, depth + 1);
      } else if (tag === "strong" || tag === "b") {
        collectRuns(innerHtml, pendingRuns, { ...ctx, bold: true }, depth + 1);
      } else if (tag === "em" || tag === "i") {
        collectRuns(innerHtml, pendingRuns, { ...ctx, italic: true }, depth + 1);
      } else if (tag === "u") {
        collectRuns(innerHtml, pendingRuns, { ...ctx, underline: true }, depth + 1);
      } else if (tag === "a") {
        // Treat links as underlined text
        collectRuns(innerHtml, pendingRuns, { ...ctx, underline: true }, depth + 1);
      } else if (tag === "span" || tag === "abbr" || tag === "code" || tag === "small" || tag === "sub" || tag === "sup") {
        collectRuns(innerHtml, pendingRuns, ctx, depth + 1);
      } else if (tag === "blockquote") {
        flushRuns();
        const bqRuns: string[] = [];
        collectRuns(innerHtml, bqRuns, { ...ctx, italic: true }, depth + 1);
        if (bqRuns.length > 0) {
          output.push(makeParagraph(bqRuns.join("")));
        }
      } else {
        // Unknown block-level: recurse
        processNodes(innerHtml, output, ctx, tag, depth + 1);
      }

      i = nextI;
      continue;
    }

    // Close tags without matching open, skip
    i++;
  }

  flushRuns();
}

/** Collect inline runs without creating new paragraphs */
function collectRuns(html: string, runs: string[], ctx: Context, depth: number): void {
  if (depth > 50) return;
  const tokens = tokenize(html);

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "text") {
      const text = token.content.replace(/\s+/g, " ");
      if (text.trim()) {
        runs.push(makeRun(text, { bold: ctx.bold, italic: ctx.italic, underline: ctx.underline }));
      }
    } else if (token.type === "selfClosing") {
      if (token.tagName?.toLowerCase() === "br") {
        runs.push('<w:r><w:br/></w:r>');
      }
    } else if (token.type === "open") {
      const tag = token.tagName!.toLowerCase();
      const inner = extractInnerContent(tokens, i);
      if (tag === "strong" || tag === "b") {
        collectRuns(inner.content, runs, { ...ctx, bold: true }, depth + 1);
      } else if (tag === "em" || tag === "i") {
        collectRuns(inner.content, runs, { ...ctx, italic: true }, depth + 1);
      } else if (tag === "u") {
        collectRuns(inner.content, runs, { ...ctx, underline: true }, depth + 1);
      } else {
        collectRuns(inner.content, runs, ctx, depth + 1);
      }
      i = inner.endIndex;
    }
  }
}

function processListItems(html: string, output: string[], ctx: Context, depth: number): void {
  if (depth > 50) return;
  const tokens = tokenize(html);
  const numId = ctx.listType === "number" ? 2 : 1;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "open" && token.tagName?.toLowerCase() === "li") {
      const inner = extractInnerContent(tokens, i);
      const liRuns: string[] = [];

      // Check for nested lists
      const hasNestedList = /<[uo]l[\s>]/i.test(inner.content);
      if (hasNestedList) {
        // Split: text before nested list, then nested list
        const textBefore = inner.content.replace(/<[uo]l[\s\S]*$/i, "");
        const nestedListMatch = inner.content.match(/<([uo]l)[\s\S]*$/i);
        collectRuns(textBefore, liRuns, ctx, depth + 1);
        if (liRuns.length > 0) {
          output.push(makeParagraph(liRuns.join(""), undefined, ctx.listLevel, numId));
        }
        if (nestedListMatch) {
          const nestedTag = nestedListMatch[1].toLowerCase();
          const nestedType = nestedTag === "ol" ? "number" : "bullet";
          processNodes(inner.content.slice(textBefore.length), output, { ...ctx, listType: nestedType as "bullet" | "number" }, "li", depth + 1);
        }
      } else {
        collectRuns(inner.content, liRuns, ctx, depth + 1);
        if (liRuns.length > 0) {
          output.push(makeParagraph(liRuns.join(""), undefined, ctx.listLevel, numId));
        }
      }
      i = inner.endIndex;
    }
  }
}

function processTable(html: string, output: string[], ctx: Context, depth: number): void {
  if (depth > 50) return;

  const rows: string[] = [];
  // Extract all tr elements
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const cells: string[] = [];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      const cellContent = cellMatch[1];
      const cellRuns: string[] = [];
      collectRuns(cellContent, cellRuns, ctx, depth + 1);
      const cellPara = makeParagraph(cellRuns.join(""));
      cells.push(`<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr>${cellPara}</w:tc>`);
    }
    if (cells.length > 0) {
      rows.push(`<w:tr>${cells.join("")}</w:tr>`);
    }
  }

  if (rows.length > 0) {
    const tblPr = `<w:tblPr>
      <w:tblStyle w:val="TableGrid"/>
      <w:tblW w:w="0" w:type="auto"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      </w:tblBorders>
      <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
    </w:tblPr>`;
    output.push(`<w:tbl>${tblPr}${rows.join("")}</w:tbl>`);
  }
}

/* ── Tokenizer ── */

interface Token {
  type: "text" | "open" | "close" | "selfClosing";
  content: string;
  tagName?: string;
}

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    // Text before this tag
    if (match.index > lastIndex) {
      const text = html.slice(lastIndex, match.index);
      if (text) tokens.push({ type: "text", content: text });
    }

    const fullTag = match[0];
    const tagName = match[1];

    if (fullTag.startsWith("</")) {
      tokens.push({ type: "close", content: fullTag, tagName });
    } else if (fullTag.endsWith("/>") || ["br", "hr", "img", "input", "meta", "link", "col", "area", "base", "embed", "source", "track", "wbr"].includes(tagName.toLowerCase())) {
      tokens.push({ type: "selfClosing", content: fullTag, tagName });
    } else {
      tokens.push({ type: "open", content: fullTag, tagName });
    }

    lastIndex = match.index + fullTag.length;
  }

  // Remaining text
  if (lastIndex < html.length) {
    const text = html.slice(lastIndex);
    if (text) tokens.push({ type: "text", content: text });
  }

  return tokens;
}

function extractInnerContent(
  tokens: Token[],
  openIndex: number,
): { content: string; endIndex: number } {
  const openTag = tokens[openIndex].tagName!.toLowerCase();
  let depth = 1;
  let i = openIndex + 1;
  const parts: string[] = [];

  while (i < tokens.length && depth > 0) {
    const t = tokens[i];
    if (t.type === "open" && t.tagName?.toLowerCase() === openTag) {
      depth++;
      parts.push(t.content);
    } else if (t.type === "close" && t.tagName?.toLowerCase() === openTag) {
      depth--;
      if (depth > 0) parts.push(t.content);
    } else {
      parts.push(t.content);
    }
    i++;
  }

  return { content: parts.join(""), endIndex: i - 1 };
}

/* ── OOXML Document Assembly ── */

function buildDocumentXml(paragraphs: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:w10="urn:schemas-microsoft-com:office:word"
            xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function buildStylesXml(): string {
  const headingStyles = [1, 2, 3, 4, 5, 6].map(level => {
    const sizes = [32, 28, 26, 24, 22, 20]; // half-points
    return `<w:style w:type="paragraph" w:styleId="Heading${level}">
      <w:name w:val="heading ${level}"/>
      <w:basedOn w:val="Normal"/>
      <w:next w:val="Normal"/>
      <w:qFormat/>
      <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
      <w:rPr><w:b/><w:sz w:val="${sizes[level - 1]}"/><w:szCs w:val="${sizes[level - 1]}"/></w:rPr>
    </w:style>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr>
  </w:style>
  ${headingStyles}
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:basedOn w:val="TableNormal"/>
    <w:tblPr>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
      </w:tblBorders>
    </w:tblPr>
  </w:style>
  <w:style w:type="table" w:default="1" w:styleId="TableNormal">
    <w:name w:val="Normal Table"/>
    <w:tblPr><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr>
  </w:style>
</w:styles>`;
}

function buildNumberingXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u2022"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u25E6"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="\u25AA"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="2160" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;
}

async function buildDocxZip(documentXml: string, stylesXml: string, numberingXml: string): Promise<Uint8Array> {
  const { default: JSZip } = await import("https://esm.sh/jszip@3.10.1");
  const zip = new JSZip();

  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`);

  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/numbering.xml", numberingXml);

  zip.file("word/_rels/document.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`);

  return await zip.generateAsync({ type: "uint8array" });
}
