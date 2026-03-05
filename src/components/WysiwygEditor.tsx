import { useEffect, useCallback, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HeadingNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { TableNode, TableCellNode, TableRowNode, INSERT_TABLE_COMMAND } from "@lexical/table";
import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import {
  FORMAT_TEXT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $getRoot,
  type EditorState,
  type LexicalEditor,
} from "lexical";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode } from "@lexical/rich-text";
import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Heading2, Table as TableIcon, Undo, Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

const editorTheme = {
  paragraph: "editor-paragraph",
  heading: {
    h1: "editor-heading-h1",
    h2: "editor-heading-h2",
    h3: "editor-heading-h3",
  },
  text: {
    bold: "editor-text-bold",
    italic: "editor-text-italic",
    underline: "editor-text-underline",
    strikethrough: "editor-text-strikethrough",
  },
  list: {
    ul: "editor-list-ul",
    ol: "editor-list-ol",
    listitem: "editor-list-item",
    nested: { listitem: "editor-nested-list-item" },
  },
  table: "editor-table",
  tableCell: "editor-table-cell",
  tableCellHeader: "editor-table-header",
  tableRow: "editor-table-row",
};

/* ---------- Toolbar ---------- */
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return;
        const formats = new Set<string>();
        if (sel.hasFormat("bold")) formats.add("bold");
        if (sel.hasFormat("italic")) formats.add("italic");
        if (sel.hasFormat("underline")) formats.add("underline");
        setActiveFormats(formats);
      });
    });
  }, [editor]);

  const ToolBtn = ({
    active, onClick, children, title,
  }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
    <Button
      type="button" variant="ghost" size="icon"
      className={cn("h-8 w-8", active && "bg-accent text-accent-foreground")}
      onClick={onClick} title={title}
    >
      {children}
    </Button>
  );

  return (
    <div className="flex flex-wrap gap-0.5 border-b p-1 bg-muted/50">
      <ToolBtn active={activeFormats.has("bold")} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")} title="Bold">
        <Bold className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn active={activeFormats.has("italic")} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")} title="Italic">
        <Italic className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn active={activeFormats.has("underline")} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")} title="Underline">
        <UnderlineIcon className="h-4 w-4" />
      </ToolBtn>
      <div className="w-px bg-border mx-1" />
      <ToolBtn onClick={() => {
        editor.update(() => {
          const sel = $getSelection();
          if ($isRangeSelection(sel)) $setBlocksType(sel, () => $createHeadingNode("h2"));
        });
      }} title="Heading">
        <Heading2 className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="Bullet List">
        <List className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} title="Ordered List">
        <ListOrdered className="h-4 w-4" />
      </ToolBtn>
      <div className="w-px bg-border mx-1" />
      <ToolBtn onClick={() => editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: "3", columns: "3", includeHeaders: true })} title="Insert Table">
        <TableIcon className="h-4 w-4" />
      </ToolBtn>
      <div className="w-px bg-border mx-1" />
      <ToolBtn onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="Undo">
        <Undo className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="Redo">
        <Redo className="h-4 w-4" />
      </ToolBtn>
    </div>
  );
}

/* ---------- HTML Import Plugin ---------- */
function HtmlImportPlugin({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();
  const [lastImported, setLastImported] = useState(html);

  useEffect(() => {
    if (html === lastImported) return;
    setLastImported(html);
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      if (!html) {
        root.append($createParagraphNode());
        return;
      }
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      if (nodes.length === 0) {
        root.append($createParagraphNode());
      } else {
        nodes.forEach((n) => root.append(n));
      }
    });
  }, [html, editor, lastImported]);

  return null;
}

/* ---------- Main Component ---------- */
interface WysiwygEditorProps {
  content: string;
  onChange: (html: string) => void;
  className?: string;
}

export default function WysiwygEditor({ content, onChange, className }: WysiwygEditorProps) {
  const handleChange = useCallback(
    (_editorState: EditorState, editor: LexicalEditor) => {
      editor.read(() => {
        const html = $generateHtmlFromNodes(editor);
        onChange(html);
      });
    },
    [onChange],
  );

  const initialConfig = {
    namespace: "WysiwygEditor",
    theme: editorTheme,
    nodes: [HeadingNode, ListNode, ListItemNode, TableNode, TableCellNode, TableRowNode],
    onError: (error: Error) => console.error("Lexical error:", error),
    editorState: (editor: LexicalEditor) => {
      if (!content) return;
      const parser = new DOMParser();
      const dom = parser.parseFromString(content, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      nodes.forEach((n) => root.append(n));
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn("border rounded-md overflow-hidden bg-background lexical-editor", className)}>
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="prose prose-sm max-w-none p-4 min-h-[300px] outline-none" />
            }
            placeholder={
              <div className="absolute top-4 left-4 text-muted-foreground pointer-events-none">
                Start typing…
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <TablePlugin />
        <OnChangePlugin onChange={handleChange} />
        <HtmlImportPlugin html={content} />
      </div>
    </LexicalComposer>
  );
}
