import { useNavigate } from "react-router-dom";
import { BRAND } from "@/lib/branding";
import BrandLogo from "@/components/BrandLogo";
import mockupResume from "@/assets/mockup-resume.jpg";
import mockupCoverLetter from "@/assets/mockup-cover-letter.jpg";
import mockupDashboard from "@/assets/mockup-dashboard.jpg";
import mockupRoadmap from "@/assets/mockup-roadmap.jpg";
import mockupCustomAsset from "@/assets/mockup-custom-asset.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TIER_CONFIGS, type TierConfig } from "@/lib/subscriptionTiers";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  ShieldAlert,
  Map,
  Network,
  Link2,
  Sparkles,
  Download,
  Check,
  ArrowRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function LandingNav() {
  const navigate = useNavigate();
  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <BrandLogo size="md" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
          <Button size="sm" className="shadow-[var(--shadow-warm)]" onClick={() => navigate("/auth")}>
            Get Started Free
          </Button>
        </div>
      </div>
    </nav>
  );
}

/* ----------------------------- Hero ----------------------------- */

function Hero() {
  const navigate = useNavigate();

  const scrollToPricing = () => {
    const el = document.getElementById("pricing");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden py-24 sm:py-32 noise-texture">
      {/* Warm gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/8" />
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-accent/15 blur-[100px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
        <Badge variant="outline" className="mb-6 text-xs uppercase tracking-widest border-primary/30 text-primary font-body">
          Sorry not sorry
        </Badge>
        <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Using this isn't fair to the{" "}
          <span className="relative inline-block">
            <span className="relative z-10">other applicants</span>
            <span className="absolute bottom-1 left-0 right-0 h-3 bg-primary/20 -skew-x-3 rounded-sm" />
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
          Paste a job URL. Get a full suite of AI-crafted, company-branded application
          materials — resume, cover letter, executive dashboard, and more — in minutes.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="gap-2 shadow-[var(--shadow-warm)] text-base px-8" onClick={() => navigate("/auth")}>
            Start for Free <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="text-base" onClick={scrollToPricing}>
            See Pricing
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card required · Free tier forever
        </p>
      </div>
    </section>
  );
}

/* -------------------------- Features ---------------------------- */

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Branded Dashboards",
    desc: "Sales pipeline trackers, patient outcome summaries, supply chain KPIs — whatever your field, beautifully styled to the company's brand.",
  },
  {
    icon: FileText,
    title: "Tailored Cover Letters",
    desc: "From nursing leadership to financial analysis to marketing strategy — every letter is mapped to the JD and your unique experience.",
  },
  {
    icon: BarChart3,
    title: "Strategic Reports",
    desc: "Market entry analyses for product managers, cost-reduction plans for operations leads, clinical quality reviews for healthcare pros.",
  },
  {
    icon: ShieldAlert,
    title: "Risk & Readiness Logs",
    desc: "Compliance checklists for finance, safety audits for manufacturing, vendor risk assessments for procurement — day-one deliverables for any role.",
  },
  {
    icon: Map,
    title: "90-Day Roadmaps",
    desc: "Onboarding plans tailored to your function — territory ramp for sales, curriculum rollout for education, store launch for retail management.",
  },
  {
    icon: Network,
    title: "Industry-Specific Visuals",
    desc: "Org charts, process flows, system diagrams, campaign blueprints — visual proof of expertise, whatever your domain.",
  },
];

function Features() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Everything You Need to Stand Out
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Six AI-generated materials, each tailored to the role and company you're targeting.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="group transition-all hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------- How It Works --------------------------- */

const STEPS = [
  {
    icon: Link2,
    num: "1",
    title: "Paste a Job URL",
    desc: `Drop in the link to any job posting. ${BRAND.name} scrapes the description and researches the company automatically.`,
  },
  {
    icon: Sparkles,
    num: "2",
    title: "AI Generates Your Materials",
    desc: "In minutes, receive a full suite of branded, role-specific documents — resume, cover letter, dashboard, and more.",
  },
  {
    icon: Download,
    num: "3",
    title: "Download & Apply",
    desc: "Review, vibe edit with AI chat, then export as PDF. You're ready to apply with confidence.",
  },
];

function HowItWorks() {
  return (
    <section className="relative border-y border-border/60 py-20 sm:py-24 noise-texture">
      <div className="absolute inset-0 bg-muted/40" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-center font-heading text-3xl font-bold text-foreground sm:text-4xl">
          How It Works
        </h2>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.num} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold shadow-[var(--shadow-warm)]">
                {s.num}
              </div>
              <h3 className="mt-5 font-heading text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------- Example Assets -------------------------- */

const EXAMPLES = [
  { label: "Tailored Resume", img: mockupResume },
  { label: "Cover Letter", img: mockupCoverLetter },
  { label: "Executive Dashboard", img: mockupDashboard },
  { label: "90-Day Roadmap", img: mockupRoadmap },
  { label: "Custom Asset", img: mockupCustomAsset },
];

function ExampleAssets() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center font-heading text-3xl font-bold text-foreground sm:text-4xl">
          See What {BRAND.name} Creates
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Each document is generated in real-time and styled to the company's brand.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {EXAMPLES.map((ex) => (
            <Card key={ex.label} className="overflow-hidden group transition-all hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5">
              <div className="overflow-hidden">
                <img
                  src={ex.img}
                  alt={`${ex.label} mockup`}
                  className="h-52 w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <CardContent className="p-4">
                <p className="font-heading text-sm font-semibold text-foreground">{ex.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------- Pricing -------------------------------- */

function PricingCard({ config }: { config: TierConfig }) {
  const navigate = useNavigate();
  return (
    <Card
      className={`relative flex flex-col transition-all ${
        config.highlighted ? "border-primary shadow-[var(--shadow-warm)] ring-2 ring-primary/20 -translate-y-1" : ""
      }`}
    >
      {config.highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground shadow-sm">
          Most Popular
        </Badge>
      )}
      <CardContent className="flex flex-1 flex-col gap-5 p-6 pt-8">
        <div>
          <h3 className="font-heading text-xl font-bold text-foreground">{config.label}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="flex items-end gap-1">
          <span className="font-heading text-4xl font-extrabold text-foreground">
            ${config.price}
          </span>
          {config.price > 0 && <span className="mb-1 text-sm text-muted-foreground">/mo</span>}
        </div>
        <ul className="flex-1 space-y-2">
          {config.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>
        <Button
          className={`w-full ${config.highlighted ? "shadow-[var(--shadow-warm)]" : ""}`}
          variant={config.highlighted ? "default" : "outline"}
          onClick={() => navigate("/auth")}
        >
          {config.cta}
        </Button>
      </CardContent>
    </Card>
  );
}

function Pricing() {
  const tiers = Object.values(TIER_CONFIGS);
  return (
    <section id="pricing" className="relative border-t border-border/60 py-20 sm:py-24 noise-texture">
      <div className="absolute inset-0 bg-muted/40" />
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-center font-heading text-3xl font-bold text-foreground sm:text-4xl">
          Simple, Transparent Pricing
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Start free. Upgrade when you need more power.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {tiers.map((t) => (
            <PricingCard key={t.tier} config={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------- Testimonials ---------------------------- */

const TESTIMONIALS = [
  { name: "Sarah M.", company: "Deloitte", quote: `${BRAND.name} helped me stand out from 500+ applicants. The branded dashboard blew the hiring manager away!` },
  { name: "James T.", company: "Cleveland Clinic", quote: "I landed my dream healthcare admin role in 3 weeks. The tailored cover letter was incredibly compelling." },
  { name: "Priya K.", company: "JPMorgan Chase", quote: "The RAID log showed I was ready for day one. My interviewer said it was unlike anything they'd seen." },
  { name: "Marcus L.", company: "Target", quote: `Went from zero callbacks to 4 offers. ${BRAND.name} completely transformed my application strategy.` },
  { name: "Elena R.", company: "Pfizer", quote: "The executive dashboard made me look like a senior strategist. Got the offer within a week!" },
  { name: "David W.", company: "Accenture", quote: "Every asset was perfectly branded. It felt like I had a professional design team behind me." },
  { name: "Aisha B.", company: "Southwest Airlines", quote: `${BRAND.name}'s AI resume matched every keyword in the JD. Recruiter told me it was a perfect fit.` },
  { name: "Tom H.", company: "KPMG", quote: "The 90-day roadmap sealed the deal. They said no other candidate came that prepared." },
  { name: "Nina C.", company: "Whole Foods", quote: "I was skeptical at first, but the quality of the generated assets is genuinely impressive." },
  { name: "Ryan P.", company: "State Farm", quote: `Applied to 5 roles with ${BRAND.name} materials — got interviews at all 5. Absolute game-changer.` },
  { name: "Lisa G.", company: "HCA Healthcare", quote: "As a nurse manager, the cover letter nailed my clinical leadership experience perfectly." },
  { name: "Carlos D.", company: "FedEx", quote: "The architecture diagram helped me land a logistics tech role I didn't think I was qualified for." },
  { name: "Monica J.", company: "Hilton", quote: "Switched from retail to hospitality management. The generated assets made my transferable skills shine." },
  { name: "Kevin R.", company: "Ernst & Young", quote: "The executive report positioned me as a thought leader. Got a senior consultant offer on the first try." },
  { name: "Diane F.", company: "Mayo Clinic", quote: `Transitioning from military to civilian healthcare — ${BRAND.name} translated my experience beautifully.` },
  { name: "Andre W.", company: "Home Depot", quote: `I'm not tech-savvy at all, but ${BRAND.name} made my operations manager application look world-class.` },
];

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[number] }) {
  return (
    <Card className="min-w-[320px] max-w-[360px] shrink-0 border-border/60">
      <CardContent className="p-5 flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-muted-foreground italic">"{t.quote}"</p>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
            {t.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t.name}</p>
            <p className="text-xs text-muted-foreground">Hired at {t.company}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const ROW1 = TESTIMONIALS.slice(0, 8);
const ROW2 = TESTIMONIALS.slice(8);

function Testimonials() {
  return (
    <section className="border-t border-border/60 py-16 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-10 text-center">
        <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
          Loved by Job Seekers Everywhere
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Real results from professionals across every industry.
        </p>
      </div>

      {/* Row 1 — scrolls left */}
      <div className="relative flex gap-6 py-2 animate-marquee hover:[animation-play-state:paused]">
        {[...ROW1, ...ROW1].map((t, i) => (
          <TestimonialCard key={`r1-${i}`} t={t} />
        ))}
      </div>

      {/* Row 2 — scrolls right */}
      <div className="relative flex gap-6 py-2 mt-4 animate-marquee-reverse hover:[animation-play-state:paused]">
        {[...ROW2, ...ROW2].map((t, i) => (
          <TestimonialCard key={`r2-${i}`} t={t} />
        ))}
      </div>
    </section>
  );
}

/* ----------------------- CTA Footer ----------------------------- */

function CtaFooter() {
  const navigate = useNavigate();
  return (
    <section className="relative py-24 sm:py-28 noise-texture">
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-background to-background" />
      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
        <BrandLogo size="lg" className="justify-center mb-4" />
        <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
          Ready to Make It Unfair?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Join professionals who use {BRAND.name} to create compelling, AI‑crafted
          application materials in minutes.
        </p>
        <Button size="lg" className="mt-8 gap-2 shadow-[var(--shadow-warm)] text-base px-8" onClick={() => navigate("/auth")}>
          Get Started Free <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/*  Landing Page                                                     */
/* ---------------------------------------------------------------- */

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <Hero />
      <ExampleAssets />
      <HowItWorks />
      <Features />
      <Pricing />
      <Testimonials />
      <CtaFooter />
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        {BRAND.copyright(new Date().getFullYear())}
      </footer>
    </div>
  );
}
