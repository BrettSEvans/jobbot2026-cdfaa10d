import { useNavigate } from "react-router-dom";
import mockupResume from "@/assets/mockup-resume.jpg";
import mockupCoverLetter from "@/assets/mockup-cover-letter.jpg";
import mockupDashboard from "@/assets/mockup-dashboard.jpg";
import mockupRaidLog from "@/assets/mockup-raid-log.jpg";
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
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function LandingNav() {
  const navigate = useNavigate();
  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <span className="font-heading text-xl font-bold tracking-tight text-foreground">
          Job<span className="text-primary">Bot</span>
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
          <Button size="sm" onClick={() => navigate("/auth")}>
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
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/30 py-20 sm:py-28">
      {/* decorative blur blobs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
        <Badge variant="secondary" className="mb-4 text-xs uppercase tracking-wide">
          AI-Powered Career Toolkit
        </Badge>
        <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Land Your Dream Job with{" "}
          <span className="text-primary">AI‑Crafted Assets</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Paste a job URL and let JobBot generate a tailored resume, cover
          letter, executive dashboard, and more — all branded to the company
          you're applying to.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" className="gap-2" onClick={() => navigate("/auth")}>
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={scrollToPricing}>
            See Pricing
          </Button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------- Features ---------------------------- */

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Branded Dashboards",
    desc: "Interactive KPI dashboards styled with the target company's branding.",
  },
  {
    icon: FileText,
    title: "Tailored Cover Letters",
    desc: "Personalised cover letters that match the job description and your experience.",
  },
  {
    icon: BarChart3,
    title: "Executive Reports",
    desc: "One-page strategic reports demonstrating domain expertise.",
  },
  {
    icon: ShieldAlert,
    title: "RAID Logs",
    desc: "Risks, Assumptions, Issues & Dependencies — ready for day-one delivery.",
  },
  {
    icon: Map,
    title: "90-Day Roadmaps",
    desc: "Actionable onboarding plans that show you're ready to hit the ground running.",
  },
  {
    icon: Network,
    title: "Architecture Diagrams",
    desc: "System design visuals that prove technical depth at a glance.",
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
            Six AI-generated assets, each tailored to the role and company you're targeting.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="group transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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
    desc: "Drop in the link to any job posting. JobBot scrapes the description and researches the company automatically.",
  },
  {
    icon: Sparkles,
    num: "2",
    title: "AI Generates Assets",
    desc: "In minutes, receive a full suite of branded, role-specific documents — resume, cover letter, dashboard, and more.",
  },
  {
    icon: Download,
    num: "3",
    title: "Download & Apply",
    desc: "Review, refine with AI chat, then export as PDF. You're ready to apply with confidence.",
  },
];

function HowItWorks() {
  return (
    <section className="border-y border-border bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-center font-heading text-3xl font-bold text-foreground sm:text-4xl">
          How It Works
        </h2>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.num} className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold shadow-lg">
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
  { label: "RAID Log", img: mockupRaidLog },
];

function ExampleAssets() {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="text-center font-heading text-3xl font-bold text-foreground sm:text-4xl">
          See What JobBot Creates
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Each asset is generated in real-time and styled to the company's brand.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {EXAMPLES.map((ex) => (
            <Card key={ex.label} className="overflow-hidden group transition-shadow hover:shadow-md">
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
      className={`relative flex flex-col ${
        config.highlighted ? "border-primary shadow-lg ring-2 ring-primary/20" : ""
      }`}
    >
      {config.highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
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
          className="w-full"
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
    <section id="pricing" className="border-t border-border bg-muted/40 py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
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
  { name: "Sarah M.", company: "Deloitte", quote: "JobBot helped me stand out from 500+ applicants. The branded dashboard blew the hiring manager away!" },
  { name: "James T.", company: "Cleveland Clinic", quote: "I landed my dream healthcare admin role in 3 weeks. The tailored cover letter was incredibly compelling." },
  { name: "Priya K.", company: "JPMorgan Chase", quote: "The RAID log showed I was ready for day one. My interviewer said it was unlike anything they'd seen." },
  { name: "Marcus L.", company: "Target", quote: "Went from zero callbacks to 4 offers. JobBot completely transformed my application strategy." },
  { name: "Elena R.", company: "Pfizer", quote: "The executive dashboard made me look like a senior strategist. Got the offer within a week!" },
  { name: "David W.", company: "Accenture", quote: "Every asset was perfectly branded. It felt like I had a professional design team behind me." },
  { name: "Aisha B.", company: "Southwest Airlines", quote: "JobBot's AI resume matched every keyword in the JD. Recruiter told me it was a perfect fit." },
  { name: "Tom H.", company: "KPMG", quote: "The 90-day roadmap sealed the deal. They said no other candidate came that prepared." },
  { name: "Nina C.", company: "Whole Foods", quote: "I was skeptical at first, but the quality of the generated assets is genuinely impressive." },
  { name: "Ryan P.", company: "State Farm", quote: "Applied to 5 roles with JobBot materials — got interviews at all 5. Absolute game-changer." },
  { name: "Lisa G.", company: "HCA Healthcare", quote: "As a nurse manager, the cover letter nailed my clinical leadership experience perfectly." },
  { name: "Carlos D.", company: "FedEx", quote: "The architecture diagram helped me land a logistics tech role I didn't think I was qualified for." },
  { name: "Monica J.", company: "Hilton", quote: "Switched from retail to hospitality management. JobBot made my transferable skills shine." },
  { name: "Kevin R.", company: "Ernst & Young", quote: "The executive report positioned me as a thought leader. Got a senior consultant offer on the first try." },
  { name: "Diane F.", company: "Mayo Clinic", quote: "Transitioning from military to civilian healthcare — JobBot translated my experience beautifully." },
  { name: "Andre W.", company: "Home Depot", quote: "I'm not tech-savvy at all, but JobBot made my operations manager application look world-class." },
];

function TestimonialCard({ t }: { t: typeof TESTIMONIALS[number] }) {
  return (
    <Card className="min-w-[320px] max-w-[360px] shrink-0">
      <CardContent className="p-5 flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-muted-foreground italic">"{t.quote}"</p>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
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
    <section className="border-t border-border bg-muted/40 py-16 overflow-hidden">
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
    <section className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <Zap className="mx-auto h-10 w-10 text-primary" />
        <h2 className="mt-4 font-heading text-3xl font-bold text-foreground sm:text-4xl">
          Ready to Stand Out?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Join professionals who use JobBot to create compelling, AI‑crafted
          application materials in minutes.
        </p>
        <Button size="lg" className="mt-8 gap-2" onClick={() => navigate("/auth")}>
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
      <Features />
      <HowItWorks />
      <ExampleAssets />
      <Pricing />
      <Testimonials />
      <CtaFooter />
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} JobBot. All rights reserved.
      </footer>
    </div>
  );
}
