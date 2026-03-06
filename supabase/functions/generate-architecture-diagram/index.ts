import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const TIER_LIMITS: Record<string, { perHour: number; perDay: number }> = {
  free: { perHour: 5, perDay: 15 },
  pro: { perHour: 20, perDay: 100 },
  premium: { perHour: 50, perDay: 250 },
};
const DEFAULT_LIMITS = TIER_LIMITS.free;
async function checkRateLimit(req: Request, assetType: string, edgeFunction: string): Promise<Response | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const anonClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data } = await anonClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = data?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: override } = await svc.from('rate_limit_overrides').select('is_unlimited, per_hour, per_day').eq('user_id', userId).maybeSingle();
    if (override?.is_unlimited) {
      await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
      return null;
    }
    const { data: sub } = await svc.from('user_subscriptions').select('tier').eq('user_id', userId).maybeSingle();
    const tier = (sub?.tier as string) || 'free';
    const tierDefaults = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const limits = { perHour: override?.per_hour ?? tierDefaults.perHour, perDay: override?.per_day ?? tierDefaults.perDay };
    const now = Date.now();
    const { count: hourCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 3600_000).toISOString());
    const { count: dayCount } = await svc.from('generation_usage').select('*', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', new Date(now - 86400_000).toISOString());
    if ((hourCount ?? 0) >= limits.perHour || (dayCount ?? 0) >= limits.perDay) {
      const upgradeHint = tier !== 'premium' ? ` Upgrade to ${tier === 'free' ? 'Pro' : 'Premium'} for higher limits.` : '';
      return new Response(JSON.stringify({ error: `Rate limit exceeded.${upgradeHint}`, retry_after_seconds: 60, tier }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    await svc.from('generation_usage').insert({ user_id: userId, asset_type: assetType, edge_function: edgeFunction });
  } catch (e) { console.warn('Rate limit check failed, allowing request:', e); }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rateLimitResponse = await checkRateLimit(req, 'architecture-diagram', 'generate-architecture-diagram');
    if (rateLimitResponse) return rateLimitResponse;

    const { jobDescription, companyName, jobTitle, competitors, customers, products, department, branding } = await req.json();

    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: 'Job description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const brandColors = branding?.colors || {};
    const primaryColor = brandColors.primary || '#0f172a';
    const accentColor = brandColors.secondary || brandColors.accent || '#3b82f6';
    const bgDark = brandColors.background || '#0f172a';

    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const systemPrompt = `You are a Staff Technical Program Manager with a deep software architecture background. You translate complex system interactions, data flows, and microservice dependencies into clear visual diagrams.

You must create a realistic System / Process Architecture Diagram for a core system interaction relevant to the ${jobTitle || 'engineering'} role at ${companyName || 'the company'}.

COMPANY CONTEXT:
- Company: ${companyName || 'Unknown'}
- Role: ${jobTitle || 'Unknown'}
- Department: ${department || 'Engineering'}
- Products: ${(products || []).join(', ') || 'N/A'}
- Competitors: ${(competitors || []).join(', ') || 'N/A'}
- Customers: ${(customers || []).join(', ') || 'N/A'}

CRITICAL FORMAT RULES:
- Output ONLY a complete, self-contained HTML document
- Use HTML, inline CSS (flexbox/grid), and inline SVG for all visuals
- Do NOT link to any external images or stylesheets
- No markdown fences, no explanations outside the HTML

DESIGN REQUIREMENTS:
- Dark-mode tech-focused color palette using company brand colors:
  - Background: ${bgDark}
  - Primary accent: ${primaryColor}
  - Secondary accent: ${accentColor}
  - Text: #e2e8f0 (light gray on dark)
  - Node backgrounds: rgba(255,255,255,0.05) with subtle borders
- Clean sans-serif font stack (system-ui, -apple-system, sans-serif)
- Responsive layout that works at any width
- Print-friendly

DIAGRAM REQUIREMENTS:
1. Show a realistic architecture for a system this company would actually build (e.g., data pipeline, payment flow, multi-tenant architecture, ML pipeline, event-driven system)
2. Include 6-10 nodes representing: databases, APIs, microservices, queues, caches, client interfaces
3. Use inline SVG arrows with arrowhead markers to show directional data/process flow
4. Each node must have:
   - A clear label (service name)
   - A brief tech annotation below (e.g., "PostgreSQL", "Kafka", "React SPA", "Redis Cache", "gRPC")
5. Group related nodes into labeled sections/swim lanes (e.g., "Client Layer", "API Gateway", "Backend Services", "Data Layer")
6. Include a title header with project name, a "Last Updated: ${currentDate}" subtitle, and a legend explaining node types and arrow colors

ARROW CONNECTION TECHNIQUE (CRITICAL — DO NOT USE STATIC SVG COORDINATES):
Instead of hardcoding SVG x/y coordinates, you MUST use JavaScript that runs after DOM load to dynamically calculate arrow positions from the actual rendered node elements.

Implementation pattern:
1. Give every node div a unique id attribute (e.g., id="node-api-gateway").
2. Place a single full-screen SVG overlay with pointer-events:none, position:absolute, top:0, left:0, width:100%, height:100%, z-index:10.
3. Define arrowhead markers in an SVG <defs> block inside this overlay.
4. Define a JavaScript array of connections: [{from: "node-api-gateway", to: "node-auth-service", color: "#3b82f6", label: "REST"}].
5. In a window.addEventListener("load", ...) handler (plus a small setTimeout of 100ms for layout settling):
   a. For each connection, use getBoundingClientRect() on both the source and target node elements.
   b. Calculate the center-y of each node rect.
   c. Determine whether source is left/right of target, then use the appropriate horizontal edge (right edge of source → left edge of target, or vice versa).
   d. Subtract the SVG container's own getBoundingClientRect() offset so coordinates are relative to the SVG.
   e. Create an SVG <line> or <path> element with these calculated coordinates and append it to the overlay SVG.
   f. Optionally add a <text> label at the midpoint of the line.
6. Also call this drawing function on window resize.

This ensures arrows ALWAYS connect to actual node edges regardless of layout changes.

COLOR-CODE arrows by type:
- Data flow: use accent color
- Control flow: use primary color  
- Async/event: use dashed stroke with a third color

The architecture should feel authentic to ${companyName || 'the company'}'s tech stack and industry. Reference realistic technologies that match the job description.

Output ONLY the complete HTML document.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate a System Architecture Diagram for this role and company.\n\nJob Description:\n${jobDescription}`
          },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (e) {
    console.error('Architecture diagram error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
