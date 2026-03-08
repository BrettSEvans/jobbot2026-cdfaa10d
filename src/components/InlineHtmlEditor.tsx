/**
 * Inline HTML editor using a contentEditable iframe.
 * Preserves all original CSS/inline styles — unlike Lexical which strips them.
 * Used for editing generated resumes, cover letters, and other styled HTML assets.
 */
import { useRef, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, Undo, Redo,
  List, ListOrdered,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InlineHtmlEditorProps {
  html: string;
  onChange: (html: string) => void;
  className?: string;
}

function ToolBtn({ onClick, children, title, active }: {
  onClick: () => void; children: React.ReactNode; title: string; active?: boolean;
}) {
  return (
    <Button
      type="button" variant="ghost" size="icon"
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
      onClick={onClick} title={title}
    >
      {children}
    </Button>
  );
}

export default function InlineHtmlEditor({ html, onChange, className }: InlineHtmlEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  const getDoc = useCallback(() => iframeRef.current?.contentDocument ?? null, []);

  const execCommand = useCallback((cmd: string, value?: string) => {
    const doc = getDoc();
    if (!doc) return;
    doc.execCommand(cmd, false, value);
    // Sync changes back
    const body = doc.body;
    if (body) onChange(body.innerHTML);
  }, [getDoc, onChange]);

  // Initialize iframe with the HTML content
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      // Write the full HTML into the iframe, making the body contentEditable
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 16px;
              outline: none;
              min-height: 100%;
            }
            /* Subtle cursor styling for editable content */
            body:focus {
              outline: none;
            }
          </style>
        </head>
        <body contenteditable="true">${html}</body>
        </html>
      `);
      doc.close();

      // Listen for input events to sync changes
      doc.body.addEventListener("input", () => {
        onChange(doc.body.innerHTML);
      });

      // Also listen for paste to catch formatted pastes
      doc.body.addEventListener("paste", () => {
        setTimeout(() => onChange(doc.body.innerHTML), 0);
      });

      setReady(true);
    };

    iframe.addEventListener("load", handleLoad);
    // Trigger load by setting a blank src first if needed
    handleLoad();

    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
    // Only run on mount — we don't want to re-initialize on every html change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("border rounded-md overflow-hidden bg-background", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b p-1 bg-muted/50">
        <ToolBtn onClick={() => execCommand("bold")} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("italic")} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("underline")} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn onClick={() => execCommand("insertUnorderedList")} title="Bullet List">
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("insertOrderedList")} title="Ordered List">
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <div className="w-px bg-border mx-1" />
        <ToolBtn onClick={() => execCommand("undo")} title="Undo">
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => execCommand("redo")} title="Redo">
          <Redo className="h-4 w-4" />
        </ToolBtn>
      </div>

      {/* Editable iframe */}
      <iframe
        ref={iframeRef}
        className="w-full border-0"
        style={{ height: "70vh" }}
        sandbox="allow-same-origin"
        title="Edit Document"
      />
    </div>
  );
}
