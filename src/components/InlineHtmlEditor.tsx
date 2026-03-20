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
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface InlineHtmlEditorProps {
  html: string;
  onSave: (html: string) => void | Promise<void>;
  onCancel: () => void;
  height?: string;
}

const TOOLBAR_BUTTONS = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "separator" as const },
  { cmd: "insertUnorderedList", icon: List, label: "Bullet List" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered List" },
  { cmd: "separator" as const },
  { cmd: "undo", icon: Undo, label: "Undo" },
  { cmd: "redo", icon: Redo, label: "Redo" },
] as const;

export default function InlineHtmlEditor({
  html,
  onSave,
  onCancel,
  height = "60vh",
}: InlineHtmlEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [saving, setSaving] = useState(false);

  const execCommand = useCallback((cmd: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (doc) {
      doc.execCommand(cmd, false);
      iframeRef.current?.contentWindow?.focus();
    }
  }, []);

  const handleSave = useCallback(async () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    setSaving(true);
    try {
      // Get the full HTML including styles
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
    // Add a subtle editing indicator
    const style = doc.createElement("style");
    style.textContent = `
      body { outline: none; cursor: text; }
      *:focus { outline: none; }
    `;
    doc.head.appendChild(style);
  }, []);

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50 flex-wrap">
        {TOOLBAR_BUTTONS.map((btn, i) =>
          btn.cmd === "separator" ? (
            <Separator key={i} orientation="vertical" className="h-6 mx-1" />
          ) : (
            <Button
              key={btn.cmd}
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={btn.label}
              onClick={() => execCommand(btn.cmd)}
            >
              {btn.icon && <btn.icon className="h-4 w-4" />}
            </Button>
          )
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="mr-1 h-4 w-4" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
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
