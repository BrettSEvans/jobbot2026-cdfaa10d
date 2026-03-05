import { useEffect, useCallback, useState, useMemo } from "react";
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
  CLEAR_EDITOR_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $getRoot,
  $createTextNode,
  TextNode,
  type EditorState,
  type LexicalEditor,
} from "lexical";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode } from "@lexical/rich-text";

// New plugin imports
import { HorizontalRuleNode, INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/react/LexicalHorizontalRuleNode";
import { HorizontalRulePlugin } from "@lexical/react/LexicalHorizontalRulePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { LinkNode, AutoLinkNode } from "@lexical/link";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { TRANSFORMERS } from "@lexical/markdown";
import { HashtagPlugin } from "@lexical/react/LexicalHashtagPlugin";
import { HashtagNode } from "@lexical/hashtag";

import { Button } from "@/components/ui/button";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Heading2, Table as TableIcon, Undo, Redo,
  Minus, Link2, Eraser,
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
  link: "editor-link",
  hashtag: "editor-hashtag",
  horizontalRule: "editor-hr",
};

/* ---------- Emoji shortcuts map ---------- */
const EMOJI_MAP: Record<string, string> = {
  ":)": "😊", ":-)": "😊", ":(": "😞", ":-(": "😞",
  ":D": "😃", ":-D": "😃", ";)": "😉", ";-)": "😉",
  ":P": "😛", ":-P": "😛", "<3": "❤️", ":o": "😮",
  ":-o": "😮", "B)": "😎", ":/": "😕", ":-/": "😕",
  ":*": "😘", ":-*": "😘",
};

/* ---------- EmojisPlugin ---------- */
function EmojisPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    return editor.registerNodeTransform(TextNode, (node) => {
      const text = node.getTextContent();
      for (const [shortcut, emoji] of Object.entries(EMOJI_MAP)) {
        const idx = text.indexOf(shortcut);
        if (idx !== -1) {
          const before = text.slice(0, idx);
          const after = text.slice(idx + shortcut.length);
          if (before) {
            const beforeNode = $createTextNode(before);
            beforeNode.setFormat(node.getFormat());
            node.insertBefore(beforeNode);
          }
          node.setTextContent(emoji + after);
          node.select(emoji.length, emoji.length);
          return;
        }
      }
    });
  }, [editor]);
  return null;
}

/* ---------- MentionsPlugin ---------- */
const MENTION_NAMES = ["Alice Johnson", "Bob Smith", "Charlie Brown", "Diana Prince", "Eve Wilson"];

function MentionsPlugin() {
  const [editor] = useLexicalComposerContext();
  const [query, setQuery] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);

  const filteredNames = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return MENTION_NAMES.filter((n) => n.toLowerCase().includes(q)).slice(0, 5);
  }, [query]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel) || !sel.isCollapsed()) {
          setQuery(null);
          setMenuAnchor(null);
          return;
        }
        const anchor = sel.anchor;
        if (anchor.type !== "text") { setQuery(null); return; }
        const text = anchor.getNode().getTextContent().slice(0, anchor.offset);
        const match = text.match(/@(\w*)$/);
        if (match) {
          setQuery(match[1]);
          const domSel = window.getSelection();
          if (domSel && domSel.rangeCount > 0) {
            const range = domSel.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setMenuAnchor({ top: rect.bottom + 4, left: rect.left });
          }
        } else {
          setQuery(null);
          setMenuAnchor(null);
        }
      });
    });
  }, [editor]);

  const insertMention = useCallback((name: string) => {
    editor.update(() => {
      const sel = $getSelection();
      if (!$isRangeSelection(sel)) return;
      const anchor = sel.anchor;
      if (anchor.type !== "text") return;
      const node = anchor.getNode();
      const text = node.getTextContent();
      const beforeAt = text.lastIndexOf("@", anchor.offset - 1);
      if (beforeAt === -1) return;
      const before = text.slice(0, beforeAt);
      const after = text.slice(anchor.offset);
      node.setTextContent(before);
      const mentionNode = $createTextNode(`@${name}`);
      mentionNode.setFormat(node.getFormat());
      node.insertAfter(mentionNode);
      const spaceNode = $createTextNode(" " + after);
      mentionNode.insertAfter(spaceNode);
      spaceNode.select(1, 1);
    });
    setQuery(null);
    setMenuAnchor(null);
  }, [editor]);

  if (!menuAnchor || !query || filteredNames.length === 0) return null;

  return (
    <div
      className="fixed z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[160px]"
      style={{ top: menuAnchor.top, left: menuAnchor.left }}
    >
      {filteredNames.map((name) => (
        <button
          key={name}
          className="block w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          onMouseDown={(e) => { e.preventDefault(); insertMention(name); }}
        >
          {name}
        </button>
      ))}
    </div>
  );
}

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

  const handleInsertLink = () => {
    const url = prompt("Enter URL:");
    if (!url) return;
    editor.update(() => {
      const sel = $getSelection();
      if ($isRangeSelection(sel)) {
        const { LinkNode: _LN, $createLinkNode } = require("@lexical/link");
        const linkNode = $createLinkNode(url);
        sel.insertNodes([linkNode]);
      }
    });
  };

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
      <ToolBtn onClick={() => editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined)} title="Horizontal Rule">
        <Minus className="h-4 w-4" />
      </ToolBtn>
      <ToolBtn onClick={handleInsertLink} title="Insert Link">
        <Link2 className="h-4 w-4" />
      </ToolBtn>
      <div className="w-px bg-border mx-1" />
      <ToolBtn onClick={() => editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined)} title="Clear Editor">
        <Eraser className="h-4 w-4" />
      </ToolBtn>
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
    nodes: [
      HeadingNode, ListNode, ListItemNode,
      TableNode, TableCellNode, TableRowNode,
      HorizontalRuleNode, LinkNode, AutoLinkNode, HashtagNode,
    ],
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
        <HorizontalRulePlugin />
        <LinkPlugin />
        <AutoFocusPlugin />
        <ClearEditorPlugin />
        <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
        <HashtagPlugin />
        <EmojisPlugin />
        <MentionsPlugin />
        <OnChangePlugin onChange={handleChange} />
        <HtmlImportPlugin html={content} />
      </div>
    </LexicalComposer>
  );
}
