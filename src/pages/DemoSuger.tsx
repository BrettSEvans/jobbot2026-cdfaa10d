export default function DemoSuger() {
  return (
    <div className="flex flex-col h-screen">
      <header className="shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-14 items-center justify-between px-4 md:px-8">
          <a href="https://saasless.ai" className="flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity">
            <span className="text-lg font-bold tracking-tight">saasless.ai</span>
          </a>
          <nav className="flex items-center gap-4">
            <a href="https://saasless.ai" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</a>
            <a href="https://saasless.ai/author" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
          </nav>
        </div>
      </header>
      <iframe
        src="/d/saasless/suger/gtm-strategy-leader"
        className="flex-1 w-full border-0"
        title="Suger Live Dashboard Demo"
      />
    </div>
  );
}
