// Static demo content for the tutorial walkthrough (new users with no applications)
// Fictional role: Acme Corp — Senior Product Manager

export const demoDashboardHtml = `
<div style="font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:24px;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
    <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:20px;">A</div>
    <div>
      <h1 style="margin:0;font-size:22px;font-weight:700;">Acme Corp — Senior Product Manager</h1>
      <p style="margin:4px 0 0;color:#6b7280;font-size:14px;">San Francisco, CA · Full-Time · $180K–$220K</p>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;">
      <div style="font-size:28px;font-weight:700;color:#16a34a;">92%</div>
      <div style="font-size:13px;color:#4b5563;">Role Fit Score</div>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;">
      <div style="font-size:28px;font-weight:700;color:#2563eb;">8/10</div>
      <div style="font-size:13px;color:#4b5563;">Skills Match</div>
    </div>
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:16px;">
      <div style="font-size:28px;font-weight:700;color:#7c3aed;">Series C</div>
      <div style="font-size:13px;color:#4b5563;">Funding Stage</div>
    </div>
  </div>
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
    <h3 style="margin:0 0 12px;font-size:16px;font-weight:600;">Executive Overview</h3>
    <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">Acme Corp is a Series C enterprise SaaS company building AI-powered workflow automation for Fortune 500 companies. The Senior Product Manager role focuses on leading the core platform team, driving product strategy for their flagship orchestration engine. Key priorities include expanding enterprise adoption, reducing time-to-value for new customers, and launching an agentic AI module in Q3.</p>
  </div>
</div>`;

export const demoCoverLetterHtml = `
<div style="font-family:Georgia,serif;max-width:700px;margin:0 auto;padding:32px;line-height:1.8;">
  <p>Dear Hiring Manager,</p>
  <p>I am writing to express my strong interest in the Senior Product Manager position at Acme Corp. With over 8 years of experience leading product teams at high-growth SaaS companies, I am excited by the opportunity to drive Acme's AI-powered workflow automation platform forward.</p>
  <p>In my current role at TechFlow Inc., I led the launch of an enterprise orchestration product that grew from 0 to $12M ARR in 18 months. I achieved this by deeply understanding customer pain points through 200+ discovery interviews, building a cross-functional team of 15 engineers and designers, and establishing a data-driven prioritization framework that improved feature adoption by 40%.</p>
  <p>What excites me most about Acme Corp is your vision for agentic AI in enterprise workflows. My experience building AI-assisted features — including a predictive task routing system that reduced manual intervention by 60% — positions me well to contribute to your Q3 agentic module launch.</p>
  <p>I would welcome the opportunity to discuss how my product leadership experience can accelerate Acme's growth trajectory.</p>
  <p>Sincerely,<br/>Alex Johnson</p>
</div>`;

export const demoResumeHtml = `
<div style="font-family:system-ui,sans-serif;max-width:750px;margin:0 auto;padding:32px;">
  <h1 style="margin:0;font-size:24px;font-weight:700;">Alex Johnson</h1>
  <p style="margin:4px 0 20px;color:#6b7280;font-size:14px;">Senior Product Manager · San Francisco, CA · alex@example.com</p>
  <hr style="border:none;border-top:2px solid #6366f1;margin-bottom:20px;"/>
  <h2 style="font-size:15px;font-weight:600;text-transform:uppercase;color:#6366f1;margin:0 0 8px;">Experience</h2>
  <div style="margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;"><strong>Senior Product Manager — TechFlow Inc.</strong><span style="color:#6b7280;font-size:13px;">2021–Present</span></div>
    <ul style="margin:6px 0;padding-left:20px;font-size:14px;color:#374151;">
      <li>Led enterprise orchestration product from 0 → $12M ARR in 18 months</li>
      <li>Managed cross-functional team of 15 engineers and designers</li>
      <li>Built predictive task routing (AI) reducing manual work by 60%</li>
    </ul>
  </div>
  <div style="margin-bottom:16px;">
    <div style="display:flex;justify-content:space-between;"><strong>Product Manager — DataBridge</strong><span style="color:#6b7280;font-size:13px;">2018–2021</span></div>
    <ul style="margin:6px 0;padding-left:20px;font-size:14px;color:#374151;">
      <li>Owned API platform serving 50M+ daily requests</li>
      <li>Improved developer onboarding NPS from 32 to 71</li>
    </ul>
  </div>
  <h2 style="font-size:15px;font-weight:600;text-transform:uppercase;color:#6366f1;margin:16px 0 8px;">Skills</h2>
  <p style="font-size:14px;color:#374151;">Product Strategy · AI/ML Products · Enterprise SaaS · Cross-functional Leadership · Data-Driven Prioritization · Agile/Scrum</p>
</div>`;

export const demoIndustryAssets = [
  {
    id: "demo-raid-log",
    title: "RAID Log",
    description: "Risk, Assumption, Issue & Dependency tracker for the role transition",
    html: `<div style="font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:24px;">
      <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;">RAID Log — Acme Corp · Senior Product Manager</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f3f4f6;"><th style="padding:8px 12px;text-align:left;border:1px solid #e5e7eb;">Type</th><th style="padding:8px 12px;text-align:left;border:1px solid #e5e7eb;">Item</th><th style="padding:8px 12px;text-align:left;border:1px solid #e5e7eb;">Impact</th><th style="padding:8px 12px;text-align:left;border:1px solid #e5e7eb;">Mitigation</th></tr></thead>
        <tbody>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#dc2626;font-weight:600;">Risk</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">Agentic AI module timeline is aggressive (Q3)</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">High</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">Propose phased rollout with MVP scope</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#2563eb;font-weight:600;">Assumption</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">Engineering team has ML infrastructure in place</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">Medium</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">Validate during first week with CTO</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#f59e0b;font-weight:600;">Issue</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">Competitor launched similar feature last month</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">Medium</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">Differentiate with enterprise-grade controls</td></tr>
          <tr><td style="padding:8px 12px;border:1px solid #e5e7eb;color:#7c3aed;font-weight:600;">Dependency</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">SOC 2 compliance for AI features</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">High</td><td style="padding:8px 12px;border:1px solid #e5e7eb;">Engage security team in sprint 1</td></tr>
        </tbody>
      </table>
    </div>`,
  },
  {
    id: "demo-architecture",
    title: "Architecture Diagram",
    description: "High-level system architecture for the AI orchestration platform",
    html: `<div style="font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:24px;">
      <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;">System Architecture — Acme Orchestration Engine</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;">
        <div style="background:#eff6ff;border:2px solid #3b82f6;border-radius:12px;padding:16px;"><strong>API Gateway</strong><br/><span style="font-size:12px;color:#6b7280;">Auth · Rate Limiting</span></div>
        <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:16px;"><strong>Orchestration Core</strong><br/><span style="font-size:12px;color:#6b7280;">Workflow Engine</span></div>
        <div style="background:#faf5ff;border:2px solid #8b5cf6;border-radius:12px;padding:16px;"><strong>AI Agent Layer</strong><br/><span style="font-size:12px;color:#6b7280;">LLM · Task Routing</span></div>
      </div>
      <div style="text-align:center;padding:8px;font-size:20px;color:#9ca3af;">↕</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;text-align:center;">
        <div style="background:#fefce8;border:2px solid #eab308;border-radius:12px;padding:16px;"><strong>Data Layer</strong><br/><span style="font-size:12px;color:#6b7280;">PostgreSQL · Redis</span></div>
        <div style="background:#fff1f2;border:2px solid #f43f5e;border-radius:12px;padding:16px;"><strong>Observability</strong><br/><span style="font-size:12px;color:#6b7280;">Metrics · Logging · Traces</span></div>
      </div>
    </div>`,
  },
  {
    id: "demo-exec-report",
    title: "Executive Report",
    description: "Strategic assessment of the role and company for executive stakeholders",
    html: `<div style="font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:24px;">
      <h2 style="font-size:18px;font-weight:700;margin:0 0 16px;">Executive Briefing — Acme Corp</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        <div style="background:#f9fafb;border-radius:12px;padding:16px;border:1px solid #e5e7eb;">
          <h4 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#6366f1;">Company Profile</h4>
          <ul style="margin:0;padding-left:16px;font-size:13px;color:#374151;line-height:1.8;">
            <li>Founded: 2019 · HQ: San Francisco</li>
            <li>Series C ($85M raised)</li>
            <li>~300 employees, hiring aggressively</li>
            <li>Key customers: Fortune 500 enterprises</li>
          </ul>
        </div>
        <div style="background:#f9fafb;border-radius:12px;padding:16px;border:1px solid #e5e7eb;">
          <h4 style="margin:0 0 8px;font-size:14px;font-weight:600;color:#6366f1;">Strategic Priorities</h4>
          <ul style="margin:0;padding-left:16px;font-size:13px;color:#374151;line-height:1.8;">
            <li>Launch agentic AI module (Q3)</li>
            <li>Expand enterprise customer base 3×</li>
            <li>Reduce onboarding time by 50%</li>
            <li>Achieve SOC 2 Type II certification</li>
          </ul>
        </div>
      </div>
      <div style="background:#eff6ff;border-radius:12px;padding:16px;border:1px solid #bfdbfe;">
        <h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">Candidate Alignment</h4>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">Strong alignment in enterprise SaaS product management, AI feature development, and cross-functional leadership. Candidate's track record of 0→$12M ARR growth directly maps to Acme's expansion targets.</p>
      </div>
    </div>`,
  },
];
