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
  Indent,
  Outdent,
  Palette,
  Highlighter,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface InlineHtmlEditorProps {
  html: string;
  onSave: (html: string) => void | Promise<void>;
  onCancel: () => void;
  height?: string;
}

const FONTS = [
  "Arial",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Garamond",
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
    const style = doc.createElement("style");
    style.textContent = `
      body { outline: none; cursor: text; }
      *:focus { outline: none; }
    `;
    doc.head.appendChild(style);
  }, []);

  const handleInsertLink = useCallback(() => {
    const url = window.prompt("Enter URL:");
    if (url) {
      execCommand("createLink", url);
    }
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

        {/* Insert link */}
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="Insert Link" onClick={handleInsertLink}>
          <Link className="h-4 w-4" />
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
          title="Resume Editor"
          onLoad={handleLoad}
        />
      </div>
    </div>
  );
}
