

# AI Chat Interface Implementation

## Overview
Add a persistent AI chat popup accessible from every page. The chat will be a floating button in the bottom-right corner (more natural for chat UX than a header link), with a popup panel that lets users ask questions and receive mock contextual responses.

## Components to Create

### 1. `src/components/AiChat.tsx` - Main Chat Component
- Floating action button (bottom-right corner) with a chat/sparkles icon, always visible
- Click toggles a chat popup panel (not a full modal -- stays anchored to the corner)
- Chat panel contains:
  - Header with title and close button
  - Scrollable message area showing conversation history
  - Input field + send button at bottom
- State: `isOpen`, `messages[]`, `isThinking`
- On send:
  1. Add user message to history
  2. Show "thinking" animation (animated dots) for 1.5s
  3. Generate a mock response that references the current page context
- Context awareness: Uses `useLocation()` from react-router to detect current route and tailors mock responses accordingly (e.g., "I see you're viewing the Applications list..." or "Looking at the dashboard for [company]...")
- Keyboard: Enter to send, Escape to close

### 2. Add to `src/App.tsx`
- Import and render `<AiChat />` inside the `BrowserRouter` (so it has access to router context) but outside `<Routes>`, making it persistent across all pages

## Technical Details

- **No backend needed** -- this is a mock/prototype. Responses are generated client-side with simple template strings
- **Styling**: Uses existing shadcn/ui components (Button, Input, ScrollArea, Card) and Tailwind classes
- **Non-blocking**: The chat is a fixed-position overlay that doesn't interfere with page content
- **Context detection**: Parses `location.pathname` to determine which view the user is on and includes that in mock responses
- **Message format**: `{ role: 'user' | 'assistant', content: string }`

## Mock Response Logic
- Maintains a small set of contextual response templates per route pattern:
  - `/` or `/applications` -- references the job applications table
  - `/applications/new` -- references the application creation flow
  - `/applications/:id` -- references the specific dashboard being viewed
  - `/templates` -- references template management
- Responses feel conversational and reference the current view naturally

## Files Changed
| File | Action |
|------|--------|
| `src/components/AiChat.tsx` | Create |
| `src/App.tsx` | Edit -- add `<AiChat />` inside `<BrowserRouter>` |
