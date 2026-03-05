import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getTutorialSteps } from "@/lib/tutorial/registry";
import SpotlightMask from "./SpotlightMask";
import TutorialBubble from "./TutorialBubble";
import type { TutorialStep } from "@/lib/tutorial/types";

interface TutorialOverlayProps {
  onDismiss: () => void;
}

export default function TutorialOverlay({ onDismiss }: TutorialOverlayProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [steps, setSteps] = useState<TutorialStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [waitingForElement, setWaitingForElement] = useState(false);

  // Load steps once
  useEffect(() => {
    const loaded = getTutorialSteps();
    setSteps(loaded);
    if (loaded.length === 0) {
      onDismiss();
    }
  }, [onDismiss]);

  const currentStep = steps[currentIndex];

  // Route matching check
  const routeMatches = useCallback(
    (stepRoute: string | undefined) => {
      if (!stepRoute) return true;
      if (stepRoute === pathname) return true;
      const pattern = stepRoute.replace(/:[^/]+/g, "[^/]+");
      return new RegExp(`^${pattern}$`).test(pathname);
    },
    [pathname]
  );

  // Navigate to correct route if needed, then wait for element
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.route && !routeMatches(currentStep.route)) {
      // Navigate to the step's route (use a concrete path for param routes)
      const targetRoute = currentStep.route.includes(":id")
        ? currentStep.route // Can't navigate to param routes without an ID - skip
        : currentStep.route;

      if (targetRoute.includes(":")) {
        // Skip steps that require a specific application ID
        handleNext();
        return;
      }
      navigate(targetRoute);
      setWaitingForElement(true);
      return;
    }

    // Wait for the target element to appear
    setWaitingForElement(true);
    let attempts = 0;
    const maxAttempts = 60; // 3 seconds at 50ms intervals
    const poll = setInterval(() => {
      attempts++;
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        setWaitingForElement(false);
        clearInterval(poll);
        // Scroll element into view if needed
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (attempts >= maxAttempts) {
        // Element not found — skip this step gracefully
        clearInterval(poll);
        setWaitingForElement(false);
        if (currentIndex < steps.length - 1) {
          setCurrentIndex((i) => i + 1);
        } else {
          onDismiss();
        }
      }
    }, 50);

    return () => clearInterval(poll);
  }, [currentStep, pathname, currentIndex, steps.length]);

  const handleNext = useCallback(() => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onDismiss();
    }
  }, [currentIndex, steps.length, onDismiss]);

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  if (!currentStep || waitingForElement) return null;

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
