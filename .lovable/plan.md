

## Add Lexical Plugins to WYSIWYG Editor

### Availability Assessment
- **Already have** (just need imports): RichTextPlugin, ListPlugin, TablePlugin, HistoryPlugin -- these are already in use
- **Available in installed `@lexical/react`**: HorizontalRulePlugin, LinkPlugin, AutoFocusPlugin, ClearEditorPlugin, MarkdownShortcutPlugin, HashtagPlugin
- **Require `@lexical/link` node**: LinkPlugin needs `LinkNode` and `AutoLinkNode` registered
- **Require `@lexical/hashtag` node**: HashtagPlugin needs `HashtagNode` registered
- **Not built-in**: EmojisPlugin and MentionsPlugin are custom plugins from the Lexical playground, not shipped with `@lexical/react`. These need to be built as custom components.

### Changes

**1. `src/components/WysiwygEditor.tsx`**

Add new plugin imports:
- `HorizontalRulePlugin` + `HorizontalRuleNode` + `INSERT_HORIZONTAL_RULE_COMMAND` from `@lexical/react/LexicalHorizontalRuleNode` and `@lexical/react/LexicalHorizontalRulePlugin`
- `LinkPlugin` from `@lexical/react/LexicalLinkPlugin` + `LinkNode`, `AutoLinkNode` from `@lexical/link`
- `AutoFocusPlugin` from `@lexical/react/LexicalAutoFocusPlugin`
- `ClearEditorPlugin` + `CLEAR_EDITOR_COMMAND` from `@lexical/react/LexicalClearEditorPlugin`
- `MarkdownShortcutPlugin` from `@lexical/react/LexicalMarkdownShortcutPlugin` + `TRANSFORMERS` from `@lexical/markdown`
- `HashtagPlugin` from `@lexical/react/LexicalHashtagPlugin` + `HashtagNode` from `@lexical/hashtag`

Register new nodes: `HorizontalRuleNode`, `LinkNode`, `AutoLinkNode`, `HashtagNode`

Add plugins to the composer: `<HorizontalRulePlugin />`, `<LinkPlugin />`, `<AutoFocusPlugin />`, `<ClearEditorPlugin />`, `<MarkdownShortcutPlugin transformers={TRANSFORMERS} />`, `<HashtagPlugin />`

Add toolbar buttons: Horizontal Rule (Minus icon), Insert Link (Link icon)

**2. Custom EmojisPlugin** (inline in WysiwygEditor.tsx)
A lightweight trigger-based plugin: when user types `:)`, `<3`, etc., replace with emoji unicode characters. Uses a Lexical text node transform.

**3. Custom MentionsPlugin** (inline in WysiwygEditor.tsx)
A basic `@mention` plugin: listens for `@` trigger, shows a small dropdown of placeholder names, inserts a styled mention node. Uses `LexicalTypeaheadMenuPlugin` from `@lexical/react`.

**4. Theme additions in `src/index.css`**
- `.editor-hr` for horizontal rules
- `.editor-link` for link styling
- `.editor-hashtag` for hashtag highlighting
- `.editor-mention` for mention styling

**5. Toolbar updates**
Add icons for: Horizontal Rule (`Minus`), Link (`Link2`), and Clear Editor (`Eraser`) to the toolbar with appropriate dividers.

### Note on EmojisPlugin and MentionsPlugin
These are not first-party Lexical plugins. They will be implemented as lightweight custom components following the patterns from the Lexical playground examples, keeping them minimal and focused on core functionality.

