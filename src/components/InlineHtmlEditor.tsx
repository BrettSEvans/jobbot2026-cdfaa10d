import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo,
  Redo,
  Save,
  X,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link,
  Unlink,
  Indent,
  Outdent,
  Palette,
  Highlighter,
  ChevronsUpDown,
  Rows3,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InlineHtmlEditorProps {
  html: string;
  onSave: (html: string) => void | Promise<void>;
  onCancel: () => void;
  height?: string;
}

const FONTS = [
  "Roboto",
  "Arial",
  "Calibri",
  "Times New Roman",
  "Georgia",
  "Helvetica",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Garamond",
  "Cambria",
  "Courier New",
  "Lato",
  "Open Sans",
  "Source Sans Pro",
  "Nunito",
];

const FONT_SIZES = [
  { label: "XS", value: "1" },
  { label: "S", value: "2" },
  { label: "M", value: "3" },
  { label: "L", value: "4" },
  { label: "XL", value: "5" },
  { label: "2XL", value: "6" },
  { label: "3XL", value: "7" },
];

export default function InlineHtmlEditor({
  html,
  onSave,
  onCancel,
  height = "60vh",
}: InlineHtmlEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saving, setSaving] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkPopoverOpen, setLinkPopoverOpen] = useState(false);
  const [lineSpacing, setLineSpacing] = useState("");
  const [paraSpacing, setParaSpacing] = useState("");

  const updateEditorSpacing = useCallback((ls: string, ps: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    let styleEl = doc.getElementById("editor-spacing") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = doc.createElement("style");
      styleEl.id = "editor-spacing";
      doc.head.appendChild(styleEl);
    }
    let css = "";
    if (ls) css += `body, p, li, div, span, td, th { line-height: ${ls} !important; }\n`;
    if (ps) css += `p, li, div:not(body) { margin-bottom: ${ps} !important; }\n`;
    styleEl.textContent = css;
  }, []);

  const execCommand = useCallback((cmd: string, value?: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      doc.execCommand(cmd, false, value);
      iframeRef.current?.contentWindow?.focus();
    }
  }, []);

  const handleSave = useCallback(async () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    setSaving(true);
    try {
      const serialized = `<!DOCTYPE html><html>${doc.documentElement.innerHTML}</html>`;
      await onSave(serialized);
    } finally {
      setSaving(false);
    }
  }, [onSave]);

  const handleLoad = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.designMode = "on";
    // Load Google Fonts for editor
    const fontLink = doc.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href = "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Nunito:wght@400;700&family=Open+Sans:wght@400;700&family=Roboto:wght@400;700&family=Source+Sans+Pro:wght@400;700&display=swap";
    doc.head.appendChild(fontLink);
    const style = doc.createElement("style");
    style.textContent = `
      body { outline: none; cursor: text; }
      *:focus { outline: none; }
    `;
    doc.head.appendChild(style);
  }, []);

  const handleOpenLinkPopover = useCallback(() => {
    // Grab selected text to pre-fill display text
    const doc = iframeRef.current?.contentDocument;
    const sel = doc?.getSelection();
    const selectedText = sel?.toString() || "";
    setLinkText(selectedText);
    setLinkUrl("https://");
    setLinkPopoverOpen(true);
  }, []);

  const handleInsertLink = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !linkUrl.trim()) return;

    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();

    const sel = doc.getSelection();
    if (sel && sel.rangeCount > 0) {
      const selectedText = sel.toString();
      if (selectedText) {
        // Selection exists — wrap it with a link
        doc.execCommand("createLink", false, linkUrl.trim());
      } else if (linkText.trim()) {
        // No selection but display text provided — insert new linked text
        const a = doc.createElement("a");
        a.href = linkUrl.trim();
        a.textContent = linkText.trim();
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(a);
        // Move cursor after the link
        range.setStartAfter(a);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }

    setLinkPopoverOpen(false);
    setLinkUrl("");
    setLinkText("");
  }, [linkUrl, linkText]);

  const handleUnlink = useCallback(() => {
    execCommand("unlink");
  }, [execCommand]);

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50 flex-wrap">
        {/* Font family picker */}
        <select
          className="h-8 rounded-md border border-input bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) execCommand("fontName", e.target.value);
          }}
        >
          <option value="" disabled>Font</option>
          {FONTS.map((f) => (
            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
          ))}
        </select>

        {/* Font size picker */}
        <select
          className="h-8 rounded-md border border-input bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) execCommand("fontSize", e.target.value);
          }}
        >
          <option value="" disabled>Size</option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Basic formatting */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Bold" onClick={() => execCommand("bold")}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Italic" onClick={() => execCommand("italic")}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Underline" onClick={() => execCommand("underline")}>
          <Underline className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Text color */}
        <label className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent cursor-pointer" title="Text Color">
          <Palette className="h-4 w-4" />
          <input
            type="color"
            className="absolute inset-0 opacity-0 cursor-pointer"
            defaultValue="#000000"
            onChange={(e) => execCommand("foreColor", e.target.value)}
          />
        </label>

        {/* Highlight color */}
        <label className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent cursor-pointer" title="Highlight Color">
          <Highlighter className="h-4 w-4" />
          <input
            type="color"
            className="absolute inset-0 opacity-0 cursor-pointer"
            defaultValue="#FFFF00"
            onChange={(e) => execCommand("hiliteColor", e.target.value)}
          />
        </label>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Lists */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Bullet List" onClick={() => execCommand("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Numbered List" onClick={() => execCommand("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Alignment */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Align Left" onClick={() => execCommand("justifyLeft")}>
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Align Center" onClick={() => execCommand("justifyCenter")}>
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Align Right" onClick={() => execCommand("justifyRight")}>
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Justify" onClick={() => execCommand("justifyFull")}>
          <AlignJustify className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Indent / Outdent */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Indent" onClick={() => execCommand("indent")}>
          <Indent className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Outdent" onClick={() => execCommand("outdent")}>
          <Outdent className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Line Spacing */}
        <div className="flex items-center gap-0.5" title="Line Spacing">
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="h-8 rounded-md border border-input bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            value={lineSpacing}
            onChange={(e) => {
              setLineSpacing(e.target.value);
              updateEditorSpacing(e.target.value, paraSpacing);
            }}
          >
            <option value="">Line</option>
            <option value="1.0">1.0</option>
            <option value="1.15">1.15</option>
            <option value="1.2">1.2</option>
            <option value="1.5">1.5</option>
            <option value="2.0">2.0</option>
          </select>
        </div>

        {/* Paragraph Spacing */}
        <div className="flex items-center gap-0.5" title="Paragraph Spacing">
          <Rows3 className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            className="h-8 rounded-md border border-input bg-background px-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            value={paraSpacing}
            onChange={(e) => {
              setParaSpacing(e.target.value);
              updateEditorSpacing(lineSpacing, e.target.value);
            }}
          >
            <option value="">Para</option>
            <option value="0px">None</option>
            <option value="4px">Tight</option>
            <option value="8px">Normal</option>
            <option value="12px">Relaxed</option>
            <option value="16px">Wide</option>
          </select>
        </div>

        {/* Insert link popover */}
        <Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Insert Link" onClick={handleOpenLinkPopover}>
              <Link className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-3" side="bottom" align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <p className="text-sm font-medium">Insert Hyperlink</p>
            <div className="space-y-2">
              <div>
                <Label htmlFor="link-url" className="text-xs">URL</Label>
                <Input
                  id="link-url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInsertLink(); } }}
                />
              </div>
              <div>
                <Label htmlFor="link-text" className="text-xs">Display text (optional)</Label>
                <Input
                  id="link-text"
                  placeholder="Click here"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleInsertLink(); } }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLinkPopoverOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleInsertLink} disabled={!linkUrl.trim()}>Insert</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Unlink */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Remove Link" onClick={handleUnlink}>
          <Unlink className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* Undo / Redo */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Undo" onClick={() => execCommand("undo")}>
          <Undo className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Redo" onClick={() => execCommand("redo")}>
          <Redo className="h-4 w-4" />
        </Button>

        {/* Save / Cancel */}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            <X className="mr-1 h-4 w-4" /> Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Editable iframe */}
      <div className="bg-white" style={{ height }}>
        <iframe
          ref={iframeRef}
          srcDoc={html}
          className="w-full h-full border-0"
          title="Document Editor"
          onLoad={handleLoad}
        />
      </div>
    </div>
  );
}
