import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft } from "lucide-react";

interface TourStep {
  target: string; // CSS selector
  title: string;
  content: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    target: '[href="/"], [data-tour="applications"]',
    title: "Applications Hub",
    content: "This is your main hub. All your job applications live here — click any row to see its details, or use the Pipeline tab for a Kanban board view.",
  },
  {
    target: '[data-tour="new-app"], a[href="/applications/new"]',
    title: "Create an Application",
    content: "Click here to create a new application. Paste a job URL or enter a job description manually. Use Batch Mode to submit up to 5 at once.",
  },
  {
    target: '[role="tablist"]',
    title: "Application Tabs",
    content: "Each application has tabs: Resume (with keyword analysis, diff viewer, ATS check, bullet coach), Cover Letter, JD Analysis, Materials (RAID logs, roadmaps, etc.), and Details.",
  },
  {
    target: '[value="resume"]',
    title: "Resume Tab",
    content: "Your AI-optimized resume lives here. Use Keyword Gap Analysis to inject missing keywords, view diffs, check ATS compliance, improve bullets, and review Resume Health.",
  },
  {
    target: '[value="cover-letter"]',
    title: "Cover Letter Tab",
    content: "AI-generated cover letter tailored to the job description. Edit directly, regenerate with custom instructions, or browse revision history.",
  },
  {
    target: '[value="jd-analysis"]',
    title: "JD Analysis Tab",
    content: "Deep analysis of the job description — structured intelligence, requirement categories, red flags, job health score, and a tailored summary preview. You can also edit the job URL here.",
  },
  {
    target: '[value="materials"]',
    title: "Materials Tab",
    content: "Additional AI-generated deliverables: RAID logs, roadmaps, architecture diagrams, and more. Materials are suggested based on the role type.",
  },
  {
    target: '[value="dashboard"]',
    title: "Dashboard Tab",
    content: "A branded research dashboard with company analysis and competitive landscape. Refine it with AI chat and download as HTML or ZIP.",
  },
  {
    target: '[value="details"]',
    title: "Details Tab",
    content: "Edit application metadata — company name, job title, URLs, and pipeline stage. Also shows research results like competitors and products.",
  },
  {
    target: '[data-tour="prev-next"], [title="Next application"]',
    title: "Quick Navigation",
    content: "Use the prev/next arrows to navigate between applications without going back to the list.",
  },
  {
    target: '[data-tour="pipeline-tab"], [value="pipeline"]',
    title: "Pipeline Board",
    content: "Drag-and-drop Kanban board to track applications by stage. Select multiple cards with checkboxes for bulk stage updates.",
  },
  {
    target: '[data-tour="templates"]',
    title: "Templates",
    content: "Save and reuse document templates across applications for consistent quality.",
  },
  {
    target: '[data-tour="profile"]',
    title: "Your Profile",
    content: "Set up your resume text, master cover letter, skills, and preferences. Upload multiple resumes and set one as active for each role type.",
  },
  {
    target: '[data-tour="ai-chat"]',
    title: "AI Chat",
    content: "Need help? Click AI Chat to get guidance, interview prep tips, or ask questions about your applications.",
  },
  {
    target: '[aria-label="Help"]',
    title: "Help & Docs",
    content: "Click the Help button anytime to search all topics. It automatically highlights topics relevant to your current page.",
  },
];

const TOUR_STORAGE_KEY = "resuvibe_tour_completed";

export function useTourState() {
  const [active, setActive] = useState(false);
  const completed = localStorage.getItem(TOUR_STORAGE_KEY) === "true";

  const start = useCallback(() => setActive(true), []);
  const complete = useCallback(() => {
    setActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, []);

  // Auto-launch for new users arriving from onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tour") === "1" && !completed) {
      params.delete("tour");
      const clean = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (clean ? `?${clean}` : ""));
      setActive(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for custom start-tour event (e.g. from HelpDrawer)
  useEffect(() => {
    const handler = () => setActive(true);
    window.addEventListener("resuvibe:start-tour", handler);
    return () => window.removeEventListener("resuvibe:start-tour", handler);
  }, []);

  return { active, completed, start, complete };
}

interface TutorialTourProps {
  active: boolean;
  onComplete: () => void;
}

export function TutorialTour({ active, onComplete }: TutorialTourProps) {
  const [step, setStep] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const currentStep = TOUR_STEPS[step];

  useEffect(() => {
    if (!active || !currentStep) return;

    const findTarget = () => {
      const el = document.querySelector(currentStep.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setSpotlightRect(rect);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setSpotlightRect(null);
      }
    };

    findTarget();
    const timer = setTimeout(findTarget, 300);
    return () => clearTimeout(timer);
  }, [active, step, currentStep]);

  if (!active) return null;

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setStep(0);
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    setStep(0);
    onComplete();
  };

  // Position the card near the spotlight
  const cardStyle: React.CSSProperties = {};
  if (spotlightRect) {
    const top = spotlightRect.bottom + 12;
    const left = Math.max(16, Math.min(spotlightRect.left, window.innerWidth - 340));
    cardStyle.position = "fixed";
    cardStyle.top = top > window.innerHeight - 200 ? spotlightRect.top - 180 : top;
    cardStyle.left = left;
    cardStyle.zIndex = 10001;
  } else {
    cardStyle.position = "fixed";
    cardStyle.top = "50%";
    cardStyle.left = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
    cardStyle.zIndex = 10001;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-foreground/40 z-[10000] transition-opacity"
        onClick={handleSkip}
      />

      {/* Spotlight cutout */}
      {spotlightRect && (
        <div
          className="fixed z-[10000] border-2 border-primary rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none transition-all duration-300"
          style={{
            top: spotlightRect.top - 4,
            left: spotlightRect.left - 4,
            width: spotlightRect.width + 8,
            height: spotlightRect.height + 8,
          }}
        />
      )}

      {/* Tour card */}
      <Card className="w-80 shadow-lg" style={cardStyle}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{currentStep?.title}</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSkip}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{currentStep?.content}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {step + 1} / {TOUR_STEPS.length}
            </span>
            <div className="flex gap-1.5">
              {step > 0 && (
                <Button variant="ghost" size="sm" onClick={handlePrev} className="h-7 text-xs gap-1">
                  <ArrowLeft className="h-3 w-3" /> Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext} className="h-7 text-xs gap-1">
                {step === TOUR_STEPS.length - 1 ? "Finish" : "Next"} <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
