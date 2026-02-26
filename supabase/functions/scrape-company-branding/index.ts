const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Extract CSS colors from raw HTML as a fallback
function extractColorsFromHtml(html: string): Record<string, string> {
  const colors: Record<string, string> = {};
  
  // Extract CSS custom properties (--primary, --brand-color, etc.)
  const cssVarRegex = /--([\w-]*(primary|secondary|accent|brand|main|bg|background|text|foreground|surface|highlight|cta|button|link|heading|nav|header|footer|hero)[\w-]*):\s*([^;}\n]+)/gi;
  let match;
  while ((match = cssVarRegex.exec(html)) !== null) {
    const name = match[1].trim();
    const value = match[3].trim();
    if (value && !value.includes('var(') && value.length < 80) {
      colors[`--${name}`] = value;
    }
  }

  // Extract colors from common CSS properties on key selectors
  const selectorColorRegex = /(?:body|header|nav|\.hero|\.navbar|\.header|\.footer|\.btn|\.button|a|h1|h2|h3|\.logo|\.brand|\.sidebar|\.nav-link|\.cta|\.primary|\.accent)\s*\{[^}]*?((?:background(?:-color)?|color|border-color)\s*:\s*([^;}\n]+))/gi;
  while ((match = selectorColorRegex.exec(html)) !== null) {
    const prop = match[1].split(':')[0].trim();
    const value = match[2].trim();
    if (value && !value.includes('var(') && !value.includes('inherit') && !value.includes('transparent') && !value.includes('none') && value.length < 60) {
      colors[`css-${prop}`] = value;
    }
  }

  // Extract hex colors used in inline styles or CSS
  const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
  const hexCounts: Record<string, number> = {};
  while ((match = hexRegex.exec(html)) !== null) {
    const hex = match[0].toLowerCase();
    // Skip common defaults
    if (['#fff', '#ffffff', '#000', '#000000', '#ccc', '#cccccc', '#333', '#333333', '#666', '#666666', '#999', '#eee', '#eeeeee', '#ddd', '#f5f5f5', '#fafafa'].includes(hex)) continue;
    hexCounts[hex] = (hexCounts[hex] || 0) + 1;
  }
  // Take top 6 most-used non-generic colors
  const topHexColors = Object.entries(hexCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  topHexColors.forEach(([hex], i) => {
    colors[`dominant-${i + 1}`] = hex;
  });

  // Extract rgb/rgba/hsl colors from CSS
  const rgbRegex = /(?:rgba?|hsla?)\([^)]+\)/gi;
  const rgbCounts: Record<string, number> = {};
  while ((match = rgbRegex.exec(html)) !== null) {
    const color = match[0];
    rgbCounts[color] = (rgbCounts[color] || 0) + 1;
  }
  const topRgbColors = Object.entries(rgbCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  topRgbColors.forEach(([color], i) => {
    colors[`rgb-dominant-${i + 1}`] = color;
  });

  return colors;
}

// Extract font families from HTML/CSS
function extractFontsFromHtml(html: string): string[] {
  const fonts = new Set<string>();
  
  // From Google Fonts links
  const gfRegex = /fonts\.googleapis\.com\/css2?\?family=([^"&]+)/gi;
  let match;
  while ((match = gfRegex.exec(html)) !== null) {
    const families = decodeURIComponent(match[1]).split('|');
    families.forEach(f => {
      const name = f.split(':')[0].replace(/\+/g, ' ').trim();
      if (name) fonts.add(name);
    });
  }

  // From font-family CSS declarations
  const ffRegex = /font-family\s*:\s*([^;}\n]+)/gi;
  while ((match = ffRegex.exec(html)) !== null) {
    const families = match[1].split(',');
    const primary = families[0].trim().replace(/['"]/g, '');
    if (primary && !['inherit', 'sans-serif', 'serif', 'monospace', 'system-ui', '-apple-system', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma'].includes(primary)) {
      fonts.add(primary);
    }
  }

  return [...fonts];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract a valid URL from potentially messy input
    let formattedUrl = url.trim();
    
    // If input contains multiple URLs or garbage, try to extract a clean URL
    const urlMatch = formattedUrl.match(/https?:\/\/[^\s"'<>]+/);
    if (urlMatch) {
      formattedUrl = urlMatch[0];
    } else {
      // No http(s) URL found, try to clean and prefix
      formattedUrl = formattedUrl.replace(/[^\w.\-\/:#?&=]/g, '').trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }
    }

    // Final validation
    try {
      new URL(formattedUrl);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping branding from:', formattedUrl);

    // Request branding + html for fallback color extraction
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['branding', 'markdown', 'links', 'html'],
        onlyMainContent: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl branding error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || 'Failed to scrape branding' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlBranding = data.data?.branding || data.branding || null;
    const markdown = data.data?.markdown || data.markdown || '';
    const metadata = data.data?.metadata || data.metadata || {};
    const links = data.data?.links || data.links || [];
    const html = data.data?.html || data.html || '';

    // Extract colors and fonts from raw HTML as fallback/supplement
    const extractedColors = html ? extractColorsFromHtml(html) : {};
    const extractedFonts = html ? extractFontsFromHtml(html) : [];

    // Merge: Firecrawl branding takes priority, CSS extraction fills gaps
    const branding = firecrawlBranding ? { ...firecrawlBranding } : {};
    
    // Supplement colors: if Firecrawl returned colors, keep them; add extracted ones as extras
    if (!branding.colors || Object.keys(branding.colors).length === 0) {
      branding.colors = extractedColors;
    } else {
      branding.extractedColors = extractedColors;
    }

    // Supplement fonts
    if ((!branding.fonts || branding.fonts.length === 0) && extractedFonts.length > 0) {
      branding.fonts = extractedFonts.map(f => ({ family: f }));
    } else if (extractedFonts.length > 0) {
      branding.extractedFonts = extractedFonts;
    }

    console.log('Branding result:', JSON.stringify({
      hasFirecrawlBranding: !!firecrawlBranding,
      firecrawlColorCount: firecrawlBranding?.colors ? Object.keys(firecrawlBranding.colors).length : 0,
      extractedColorCount: Object.keys(extractedColors).length,
      extractedFontCount: extractedFonts.length,
    }));

    return new Response(
      JSON.stringify({ success: true, branding, markdown, metadata, links }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Branding scrape error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to scrape branding' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
