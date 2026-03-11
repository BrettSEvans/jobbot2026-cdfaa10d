import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Linkedin, GraduationCap, Briefcase, User } from "lucide-react";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.resuvibe.com/#organization",
      "name": "ResuVibe",
      "url": "https://www.resuvibe.com",
      "logo": "https://www.resuvibe.com/logo.png"
    },
    {
      "@type": "Person",
      "@id": "https://www.resuvibe.com/author/brett-evans/#person",
      "name": "Brett Evans",
      "jobTitle": "Google, Technical Program Manager (former)",
      "sameAs": ["https://www.linkedin.com/in/mrbrettevans/"],
      "alumniOf": [
        { "@type": "CollegeOrUniversity", "name": "Purdue University" },
        { "@type": "CollegeOrUniversity", "name": "Yale University" },
        { "@type": "CollegeOrUniversity", "name": "Brown University" }
      ],
      "worksFor": { "@id": "https://www.resuvibe.com/#organization" },
      "description": "Senior Program Manager with over 15 years of experience directing complex infrastructure projects and building impactful cloud applications at scale."
    },
    {
      "@type": "SoftwareApplication",
      "name": "ResuVibe",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "AI-powered resume builder and career portfolio generator that creates ATS-optimized resumes, cover letters, 90-day roadmaps, and RAID logs directly from a job description URL."
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How is ResuVibe different from other resume builders?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Unlike competitors that only provide generic resumes, ResuVibe generates a complete, company-branded interview portfolio. By simply pasting a job URL, you automatically receive an ATS-optimized resume, tailored cover letter, 90-day onboarding roadmap, and RAID log."
          }
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "How to generate an interview portfolio with ResuVibe",
      "step": [
        { "@type": "HowToStep", "text": "Paste the target job description URL into the ResuVibe job import tool." },
        { "@type": "HowToStep", "text": "Wait for the AI to auto-extract company branding, colors, and specific job requirements." },
        { "@type": "HowToStep", "text": "Review your customized, ATS-optimized resume and portfolio, and use the vibe editing chat to make specific refinements." }
      ]
    }
  ]
};

const CAREER = [
  {
    title: "Google Cloud Infrastructure",
    role: "Senior Technical Program Manager",
    summary:
      "Directed worldwide datacenter power-usage programs, driving $70M in annual savings. Designed a $3M SOX-compliant reporting platform and scaled the department from 3 to 18 members.",
  },
  {
    title: "Leading Media Enterprise",
    role: "PMO Director",
    summary:
      "Established a cloud infrastructure and BI business line. Secured a $1.75M contract to oversee a $20M infrastructure rollout.",
  },
  {
    title: "National Corporate Services Firm",
    role: "Senior Project Manager",
    summary:
      "Led migration of legacy financial systems to Oracle PeopleSoft and built PowerBI/Tableau dashboards for C-suite risk communication.",
  },
];

const EDUCATION = [
  { credential: "Certificate, Applied Generative AI Specialization", school: "Purdue University" },
  { credential: "Masters of Environmental Studies", school: "Yale University" },
  { credential: "BA, Geophysics and Applied Mathematics", school: "Brown University" },
];

export default function Author() {
  const navigate = useNavigate();

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(JSON_LD);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandLogo size="md" />
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Home
          </Button>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-10">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <User className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Brett Evans</h1>
          <p className="text-muted-foreground text-lg">Senior Program Manager &amp; PMO Director</p>
          <a
            href="https://www.linkedin.com/in/mrbrettevans/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Linkedin className="h-4 w-4" /> LinkedIn Profile
          </a>
        </div>

        <Card>
          <CardContent className="p-6 space-y-2">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> About Brett
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Brett Evans is a Senior Program Manager with over 15 years of experience
              directing complex infrastructure projects and multi-million-dollar portfolio
              delivery for global technology leaders. He specializes in advanced BI for
              capacity planning, risk mitigation for large-scale operations, and driving
              high performance across distributed teams.
            </p>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" /> Career Highlights
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {CAREER.map((c) => (
              <Card key={c.title}>
                <CardContent className="p-5 space-y-2">
                  <Badge variant="secondary" className="text-xs">{c.role}</Badge>
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" /> Education &amp; Credentials
          </h2>
          <Card>
            <CardContent className="p-5 divide-y">
              {EDUCATION.map((e) => (
                <div key={e.school} className="py-3 first:pt-0 last:pb-0">
                  <p className="font-medium">{e.credential}</p>
                  <p className="text-sm text-muted-foreground">{e.school}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
