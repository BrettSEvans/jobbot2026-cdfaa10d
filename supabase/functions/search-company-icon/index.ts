import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractDomain(companyUrl?: string, companyName?: string): string {
  if (companyUrl) {
    try {
      const url = new URL(companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`);
      return url.hostname.replace(/^www\./, '');
    } catch {}
  }
  if (companyName) {
    return companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
  }
  return '';
}

async function tryClearbit(domain: string): Promise<string | null> {
  if (!domain) return null;
  const url = `https://logo.clearbit.com/${domain}`;
  try {
    const resp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (resp.ok) {
      const ct = resp.headers.get('content-type') || '';
      if (ct.startsWith('image/')) {
        console.log('Clearbit logo found for', domain);
        return url;
      }
    }
  } catch (e) {
    console.warn('Clearbit check failed:', e);
  }
  return null;
}

async function tryIconIcons(companyName: string, firecrawlKey?: string): Promise<string | null> {
  const searchUrl = `https://icon-icons.com/search?q=${encodeURIComponent(companyName)}`;
  try {
    const markdown = await scrapePageMarkdown(searchUrl, firecrawlKey);
    if (!markdown) return null;

    const imgRegex = /https?:\/\/[^\s\)\"]+\.(png|svg|ico)(?:\?[^\s\)\"]*)?/gi;
    const matches = markdown.match(imgRegex);
    if (matches) {
      const relevantMatch = matches.find(m => isRelevantUrl(m, companyName));
      if (relevantMatch) return relevantMatch;
    }
  } catch (e) {
    console.warn('icon-icons.com search failed:', e);
  }
  return null;
}

async function trySvgRepo(companyName: string, firecrawlKey?: string): Promise<string | null> {
  const searchUrl = `https://www.svgrepo.com/vectors/${encodeURIComponent(companyName.toLowerCase())}`;
  try {
    const markdown = await scrapePageMarkdown(searchUrl, firecrawlKey);
    if (!markdown) return null;

    const imgRegex = /https?:\/\/[^\s\)\"]+\.(svg|png)(?:\?[^\s\)\"]*)?/gi;
    const matches = markdown.match(imgRegex);
    if (matches) {
      const relevantMatch = matches.find(m => {
        const mLower = m.toLowerCase();
        if (mLower.includes('svgrepo.com/logo')) return false;
        return isRelevantUrl(m, companyName);
      });
      if (relevantMatch) return relevantMatch;
    }
  } catch (e) {
    console.warn('svgrepo.com search failed:', e);
  }
  return null;
}

async function scrapePageMarkdown(url: string, firecrawlKey?: string): Promise<string | null> {
  if (firecrawlKey) {
    try {
      const resp = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, formats: ['markdown', 'links'], onlyMainContent: true, waitFor: 2000 }),
      });
      const data = await resp.json();
      return data?.data?.markdown || data?.markdown || null;
    } catch (e) {
      console.warn('Firecrawl scrape failed for', url, e);
    }
  }

  // Fallback: direct fetch
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LogoSearchBot/1.0)' },
    });
    if (resp.ok) return await resp.text();
  } catch (e) {
    console.warn('Direct fetch failed for', url, e);
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth guard
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { companyName, companyUrl } = await req.json();

    if (!companyName && !companyUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'companyName or companyUrl required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = extractDomain(companyUrl, companyName);
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

    // Tier 1: Clearbit
    console.log('Tier 1: Trying Clearbit for domain', domain);
    let iconUrl = await tryClearbit(domain);
    if (iconUrl) {
      return new Response(
        JSON.stringify({ success: true, iconUrl, source: 'clearbit' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tier 2: icon-icons.com
    const name = companyName || domain.replace(/\.com$/, '');
    console.log('Tier 2: Trying icon-icons.com for', name);
    iconUrl = await tryIconIcons(name, firecrawlKey);
    if (iconUrl) {
      return new Response(
        JSON.stringify({ success: true, iconUrl, source: 'icon-icons' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Tier 3: svgrepo.com
    console.log('Tier 3: Trying svgrepo.com for', name);
    iconUrl = await trySvgRepo(name, firecrawlKey);
    if (iconUrl) {
      return new Response(
        JSON.stringify({ success: true, iconUrl, source: 'svgrepo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All tiers failed
    console.log('All icon search tiers exhausted, no logo found');
    return new Response(
      JSON.stringify({ success: true, iconUrl: null, source: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('search-company-icon error:', e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
