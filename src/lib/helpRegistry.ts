/**
 * Self-documenting help registry.
 * Every page/component registers its help metadata here.
 * The HelpDrawer reads from this registry at runtime.
 */

export interface HelpMeta {
  slug: string;
  title: string;
  summary: string;
  steps?: string[];
  tips?: string[];
  relatedSlugs?: string[];
  /** Route pattern this help applies to (e.g. "/" or "/applications/:id") */
  route?: string;
  keywords?: string[];
}

const registry = new Map<string, HelpMeta>();

export function registerHelp(meta: HelpMeta) {
  registry.set(meta.slug, meta);
}

export function getAllHelp(): HelpMeta[] {
  return Array.from(registry.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
}

export function getHelpBySlug(slug: string): HelpMeta | undefined {
  return registry.get(slug);
}

/**
 * Return help entries whose route matches the current pathname.
 * Supports exact matches and simple prefix/param patterns.
 */
export function getHelpForRoute(pathname: string): HelpMeta[] {
  return getAllHelp().filter((h) => {
    if (!h.route) return false;
    if (h.route === pathname) return true;
    // Convert "/applications/:id" → regex "/applications/[^/]+"
    const pattern = h.route.replace(/:[^/]+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(pathname);
  });
}

/**
 * Full-text search across title, summary, steps, tips, and keywords.
 */
export function searchHelp(query: string): HelpMeta[] {
  const q = query.toLowerCase().trim();
  if (!q) return getAllHelp();
  return getAllHelp().filter((h) => {
    const haystack = [
      h.title,
      h.summary,
      ...(h.steps ?? []),
      ...(h.tips ?? []),
      ...(h.keywords ?? []),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
