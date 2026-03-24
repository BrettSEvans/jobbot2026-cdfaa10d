import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, LevelFormat } from "docx";
import { saveAs } from "file-saver";

/**
 * Parses simple HTML into docx Paragraph elements.
 * Handles: headings (h1-h6), paragraphs, lists (ul/ol), bold, italic, underline, links, br.
 */

interface RunStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: { type: "single" };
}

function parseInlineRuns(el: Element | ChildNode, inherited: RunStyle = {}): TextRun[] {
  const runs: TextRun[] = [];
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text) {
        runs.push(new TextRun({ text, ...inherited }));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as Element).tagName.toLowerCase();
      const style = { ...inherited };
      if (tag === "b" || tag === "strong") style.bold = true;
      if (tag === "i" || tag === "em") style.italic = true;
      if (tag === "u") style.underline = { type: "single" };
      if (tag === "br") {
        runs.push(new TextRun({ text: "", break: 1 }));
      } else {
        runs.push(...parseInlineRuns(node, style));
      }
    }
  });
  return runs;
}

function headingLevel(tag: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  const map: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    h1: HeadingLevel.HEADING_1,
    h2: HeadingLevel.HEADING_2,
    h3: HeadingLevel.HEADING_3,
    h4: HeadingLevel.HEADING_4,
    h5: HeadingLevel.HEADING_5,
    h6: HeadingLevel.HEADING_6,
  };
  return map[tag];
}

function htmlToParas(container: Element, numberingRef?: { ref: string; level: number }): Paragraph[] {
  const paras: Paragraph[] = [];

  container.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || "").trim();
      if (text) {
        paras.push(new Paragraph({ children: [new TextRun(text)] }));
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (headingLevel(tag)) {
      paras.push(
        new Paragraph({
          heading: headingLevel(tag),
          children: parseInlineRuns(el),
        })
      );
    } else if (tag === "ul") {
      el.querySelectorAll(":scope > li").forEach((li) => {
        paras.push(
          new Paragraph({
            numbering: { reference: "bullets", level: 0 },
            children: parseInlineRuns(li),
          })
        );
      });
    } else if (tag === "ol") {
      el.querySelectorAll(":scope > li").forEach((li) => {
        paras.push(
          new Paragraph({
            numbering: { reference: "numbers", level: 0 },
            children: parseInlineRuns(li),
          })
        );
      });
    } else if (tag === "li" && numberingRef) {
      paras.push(
        new Paragraph({
          numbering: { reference: numberingRef.ref, level: numberingRef.level },
          children: parseInlineRuns(el),
        })
      );
    } else if (tag === "br") {
      paras.push(new Paragraph({ children: [] }));
    } else if (tag === "hr") {
      paras.push(new Paragraph({ children: [] }));
    } else if (["div", "section", "article", "header", "footer", "main", "table"].includes(tag)) {
      // Recurse into container elements
      paras.push(...htmlToParas(el));
    } else if (tag === "tr") {
      // Flatten table rows into paragraphs
      const cells: string[] = [];
      el.querySelectorAll("td, th").forEach((td) => {
        cells.push(td.textContent?.trim() || "");
      });
      if (cells.length) {
        paras.push(new Paragraph({ children: [new TextRun(cells.join("  |  "))] }));
      }
    } else {
      // p, span, a, etc.
      const runs = parseInlineRuns(el);
      if (runs.length) {
        paras.push(new Paragraph({ children: runs }));
      }
    }
  });

  return paras;
}

export async function downloadHtmlAsDocx(html: string, fileName: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const body = doc.body;

  const children = htmlToParas(body);

  const wordDoc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "\u2022",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        {
          reference: "numbers",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: "Roboto", size: 22 }, // 11pt
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "Roboto" },
          paragraph: { spacing: { before: 240, after: 120 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: "Roboto" },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 }, // US Letter
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 inch
          },
        },
        children: children.length > 0 ? children : [new Paragraph({ children: [new TextRun("")] })],
      },
    ],
  });

  const buffer = await Packer.toBlob(wordDoc);
  saveAs(buffer, fileName.endsWith(".docx") ? fileName : `${fileName}.docx`);
}

/**
 * Export plain text (cover letter) to DOCX with professional formatting.
 */
export async function downloadTextAsDocx(text: string, fileName: string) {
  const paragraphs = text.split(/\n\n+/).map(
    (block) =>
      new Paragraph({
        spacing: { after: 200 },
        children: block.split("\n").flatMap((line, i) =>
          i === 0
            ? [new TextRun(line)]
            : [new TextRun({ text: "", break: 1 }), new TextRun(line)]
        ),
      })
  );

  const wordDoc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Georgia", size: 21 }, // 10.5pt
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1080, left: 1440 },
          },
        },
        children: paragraphs.length > 0 ? paragraphs : [new Paragraph({ children: [new TextRun("")] })],
      },
    ],
  });

  const buffer = await Packer.toBlob(wordDoc);
  saveAs(buffer, fileName.endsWith(".docx") ? fileName : `${fileName}.docx`);
}
