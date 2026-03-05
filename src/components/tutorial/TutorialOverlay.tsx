import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getTutorialSteps } from "@/lib/tutorial/registry";
import { supabase } from "@/integrations/supabase/client";
import SpotlightMask from "./SpotlightMask";
import TutorialBubble from "./TutorialBubble";
import type { TutorialStep } from "@/lib/tutorial/types";

interface TutorialOverlayProps {
  onDismiss: () => void;
  tutorialMode: "live" | "demo";
}

export default function TutorialOverlay({ onDismiss, tutorialMode }: TutorialOverlayProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [waitingForElement, setWaitingForElement] = useState(false);
  const [recentAppId, setRecentAppId] = useState<string | null>(null);
  const [showFallbackBubble, setShowFallbackBubble] = useState(false);
  const consecutiveSkips = useRef(0);

  // Load steps + fetch most recent application ID
  useEffect(() => {
    const loaded = getTutorialSteps();
    setSteps(loaded);
    if (loaded.length === 0) {
      onDismiss();
    }
    if (tutorialMode === "live") {
      (async () => {
        const { data } = await supabase
          .from("job_applications")
          .select("id")
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) setRecentAppId(data.id);
      })();
    }
  }, [onDismiss, tutorialMode]);

  const currentStep = steps[currentIndex];

  // Route matching check
  const routeMatches = useCallback(
    (stepRoute: string | undefined) => {
      if (!stepRoute) return true;
      if (stepRoute === pathname) return true;
      // Demo mode: /tutorial-demo matches /applications/:id steps
      if (tutorialMode === "demo" && stepRoute === "/applications/:id" && pathname === "/tutorial-demo") return true;
      const pattern = stepRoute.replace(/:[^/]+/g, "[^/]+");
      return new RegExp(`^${pattern}$`).test(pathname);
    },
    [pathname, tutorialMode]
  );

  // Navigate to correct route if needed, then wait for element
  useEffect(() => {
    if (!currentStep) return;
    setShowFallbackBubble(false);

    if (currentStep.route && !routeMatches(currentStep.route)) {
      let targetRoute = currentStep.route;

      // Demo mode: redirect /applications/:id steps to /tutorial-demo
      if (tutorialMode === "demo" && targetRoute === "/applications/:id") {
        targetRoute = "/tutorial-demo";
      } else if (targetRoute.includes(":id")) {
        if (!recentAppId) {
          advanceOrFallback();
          return;
        }
        targetRoute = targetRoute.replace(":id", recentAppId);
      }

      if (targetRoute.includes(":")) {
        advanceOrFallback();
        return;
      }
      navigate(targetRoute);
      setWaitingForElement(true);
      return;
    }

    // Click prerequisite element if specified (e.g. click a tab)
    if (currentStep.prerequisiteSelector) {
      const prereq = document.querySelector(currentStep.prerequisiteSelector);
      if (prereq instanceof HTMLElement) {
        prereq.click();
      }
    }

    // Wait for the target element to appear
    setWaitingForElement(true);
    let attempts = 0;
    const maxAttempts = 120; // 6 seconds at 50ms intervals
    const poll = setInterval(() => {
      attempts++;
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        setWaitingForElement(false);
        setShowFallbackBubble(false);
        consecutiveSkips.current = 0;
        clearInterval(poll);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (attempts >= maxAttempts) {
        clearInterval(poll);
        setWaitingForElement(false);
        advanceOrFallback();
      }
    }, 50);

    return () => clearInterval(poll);
  }, [currentStep, pathname, currentIndex, steps.length]);

  const advanceOrFallback = useCallback(() => {
    consecutiveSkips.current += 1;
    if (consecutiveSkips.current > 3) {
      // Show fallback bubble in center without spotlight
      setShowFallbackBubble(true);
      setWaitingForElement(false);
      return;
    }
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onDismiss();
    }
  }, [currentIndex, steps.length, onDismiss]);

  const handleNext = useCallback(() => {
    consecutiveSkips.current = 0;
    setShowFallbackBubble(false);
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onDismiss();
    }
  }, [currentIndex, steps.length, onDismiss]);

  const handleBack = useCallback(() => {
    consecutiveSkips.current = 0;
    setShowFallbackBubble(false);
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  if (!currentStep) return null;

  // Fallback mode: show bubble without spotlight
  if (showFallbackBubble) {
    return (
      <>
        <div
          className="fixed inset-0 z-[9997] bg-black/30"
          onClick={(e) => e.stopPropagation()}
        />
        <TutorialBubble
          step={currentStep}
          currentIndex={currentIndex}
          totalSteps={steps.length}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={onDismiss}
        />
      </>
    );
  }

  if (waitingForElement) return null;

  return (
    <>
      {/* Click-blocking backdrop */}
      <div
        className="fixed inset-0 z-[9997]"
        onClick={(e) => e.stopPropagation()}
      />
      <SpotlightMask targetSelector={currentStep.targetSelector} />
      <TutorialBubble
        step={currentStep}
        currentIndex={currentIndex}
        totalSteps={steps.length}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={onDismiss}
      />
    </>
  );
}
