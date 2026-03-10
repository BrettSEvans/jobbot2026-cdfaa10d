import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { TutorialStep } from "@/lib/tutorial/types";

interface TutorialBubbleProps {
  step: TutorialStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

export default function TutorialBubble({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: TutorialBubbleProps) {
  const { theme } = useTheme();
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [visible, setVisible] = useState(false);

  const calculate = useCallback(() => {
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      // Position center of viewport as fallback
      setPosition({ top: window.innerHeight / 2, left: window.innerWidth / 2 - 160 });
      return;
    }
    const r = el.getBoundingClientRect();
    const bubbleWidth = 320;
    const bubbleHeight = 200;
    const gap = 16;
    const isMobile = window.innerWidth < 640;

    let top = 0;
    let left = 0;
    const placement = isMobile ? "bottom" : step.placement;

    switch (placement) {
      case "bottom":
        top = r.bottom + gap;
        left = r.left + r.width / 2 - bubbleWidth / 2;
        break;
      case "top":
        top = r.top - bubbleHeight - gap;
        left = r.left + r.width / 2 - bubbleWidth / 2;
        break;
      case "left":
        top = r.top + r.height / 2 - bubbleHeight / 2;
        left = r.left - bubbleWidth - gap;
        break;
      case "right":
        top = r.top + r.height / 2 - bubbleHeight / 2;
        left = r.right + gap;
        break;
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(left, window.innerWidth - bubbleWidth - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - bubbleHeight - 12));

    setPosition({ top, left });
  }, [step.targetSelector, step.placement]);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => {
      calculate();
      setVisible(true);
    }, 50);
    window.addEventListener("resize", calculate);
    window.addEventListener("scroll", calculate, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", calculate);
      window.removeEventListener("scroll", calculate, true);
    };
  }, [calculate]);

  const isLast = currentIndex === totalSteps - 1;
  const isFirst = currentIndex === 0;

  // Handle keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
      if (e.key === "Enter" || e.key === "ArrowRight") onNext();
      if ((e.key === "ArrowLeft") && !isFirst) onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSkip, onNext, onBack, isFirst]);

  if (!position) return null;

  const bubbleClasses = theme === "dark"
    ? "bg-[hsl(0,0%,98%)] text-[hsl(220,25%,10%)] shadow-xl"
    : "bg-card text-card-foreground shadow-2xl border border-border";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
      className={`fixed z-[9999] w-80 rounded-xl p-5 transition-all duration-300 ${bubbleClasses} ${
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
      style={{ top: position.top, left: position.left }}
    >
      {/* Close button */}
      <button
        onClick={onSkip}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Skip tutorial"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <h3 className="font-heading text-base font-semibold mb-1.5 pr-6">{step.title}</h3>
      <p className="font-body text-sm leading-relaxed opacity-80 mb-4">{step.body}</p>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                i === currentIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {!isFirst && (
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <Button size="sm" onClick={onNext} className="h-8">
            {isLast ? "Finish" : "Next"}
            {!isLast && <ChevronRight className="ml-1 h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
