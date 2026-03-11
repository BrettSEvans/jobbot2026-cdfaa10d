import { useNavigate } from "react-router-dom";
import { BRAND } from "@/lib/branding";
import BrandLogo from "@/components/BrandLogo";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
  Menu,
  Star,
  Zap,
  Trophy,
  Users,
  Quote,
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

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
          <Button size="sm" className="shadow-[var(--shadow-warm)]" onClick={() => navigate("/auth")}>
            Start Free Trial
          </Button>
        </div>

        {/* Mobile hamburger */}
        <div className="sm:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle>
                  <BrandLogo size="sm" />
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 flex flex-col gap-3">
                <Button variant="ghost" className="justify-start" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button className="shadow-[var(--shadow-warm)]" onClick={() => navigate("/auth")}>
                  Start Free Trial
                </Button>
              </div>
            </SheetContent>
          </Sheet>
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
          More than a resume writer — it's a complete portfolio builder. Paste a job URL and get AI-vibed, company-branded documents: tailored resume, cover letter, executive dashboard, 90-day roadmap, and other custom industry assets.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="gap-2 shadow-[var(--shadow-warm)] text-base px-8" onClick={() => navigate("/auth")}>
            Start Your Free Trial <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="text-base" onClick={scrollToPricing}>
            See Pricing
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          No credit card required · Multiple documents per application · 7-day free trial
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
            Not just a resume — a full portfolio that proves you're ready for day one.
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
    title: "AI Builds Your Materials",
    desc: "In minutes, receive a complete career portfolio — resume, cover letter, dashboard, roadmap, and custom assets — all branded to the company.",
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
          Your Portfolio, Visualized
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Multiple professional documents per application — not just another resume.
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
          {config.price > 0 ? (
            <span className="mb-1 text-sm text-muted-foreground">/mo</span>
          ) : (
            <span className="mb-1 text-sm text-muted-foreground">for 7 days</span>
          )}
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
          Start with a 7-day free trial. Upgrade anytime.
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

/* -------------------- Social Proof (enhancv-style) -------------- */

const STATS = [
  { value: "600,000+", label: "Portfolios Created", icon: Trophy },
  { value: "1M+", label: "Resumes Created", icon: FileText },
  { value: "4.9", label: "Average Rating", icon: Star, isStar: true },
  { value: "4×", label: "Faster to Dream Job", icon: Zap, isZap: true },
];

const REVIEWS = [
  {
    name: "Sarah M.",
    company: "Deloitte",
    quote: `${BRAND.name} helped me stand out from 500+ applicants. The branded dashboard blew the hiring manager away!`,
    timeAgo: "2 weeks ago",
  },
  {
    name: "Tom H.",
    company: "KPMG",
    quote: "The 90-day roadmap sealed the deal. They said no other candidate came that prepared.",
    timeAgo: "3 weeks ago",
    highlighted: true,
  },
  {
    name: "Ryan P.",
    company: "State Farm",
    quote: `Applied to 5 roles with ${BRAND.name} materials — got interviews at all 5. Absolute game-changer.`,
    timeAgo: "1 month ago",
  },
];

function SocialProof() {
  return (
    <section className="relative border-t border-border/60 py-20 sm:py-24 noise-texture">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-muted/20" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            Trusted by Professionals
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Join thousands who landed their dream role.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-16">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="relative flex flex-col items-center text-center rounded-2xl bg-muted/50 border border-border/40 p-6 transition-all hover:bg-muted/70 hover:shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground">
                  {s.value}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Section divider with aggregate badge */}
        <div className="relative mb-12">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center">
            <div className="flex items-center gap-2 bg-background px-5 py-2 rounded-full border border-border/60 shadow-sm">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                ))}
              </div>
              <span className="text-sm font-semibold text-foreground">4.9 / 5</span>
              <span className="text-xs text-muted-foreground">from 2,400+ reviews</span>
            </div>
          </div>
        </div>

        {/* Review cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REVIEWS.map((r) => (
            <Card
              key={r.name}
              className={`relative overflow-hidden transition-all hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 ${
                r.highlighted ? "border-t-2 border-t-primary shadow-[var(--shadow-warm)]" : ""
              }`}
            >
              <CardContent className="p-6 flex flex-col gap-4">
                {/* Quote icon */}
                <Quote className="absolute top-4 right-4 h-8 w-8 text-primary/10" />

                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-base leading-relaxed text-foreground">"{r.quote}"</p>
                <div className="flex items-center gap-3 mt-auto pt-3 border-t border-border/60">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-sm font-bold ring-2 ring-primary/10">
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{r.name}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">
                      Hired at {r.company}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.timeAgo}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
          Ready to Build Your Portfolio?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Join professionals who land interviews with complete career portfolios — not just resumes.
        </p>
        <Button size="lg" className="mt-8 gap-2 shadow-[var(--shadow-warm)] text-base px-8" onClick={() => navigate("/auth")}>
          Start Free Trial <ArrowRight className="h-4 w-4" />
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
      <SocialProof />
      <CtaFooter />
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground space-y-2 pb-[280px] sm:pb-6">
        <div className="flex items-center justify-center gap-4">
          <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          <span className="text-border">·</span>
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <span className="text-border">·</span>
          <a href="/cookies" className="hover:text-foreground transition-colors">Cookie Policy</a>
        </div>
        <p>{BRAND.copyright(new Date().getFullYear())}</p>
      </footer>
    </div>
  );
}
