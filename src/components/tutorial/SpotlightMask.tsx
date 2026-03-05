import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";

interface SpotlightMaskProps {
  targetSelector: string;
  padding?: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function SpotlightMask({ targetSelector, padding = 8 }: SpotlightMaskProps) {
  const { theme } = useTheme();
  const [rect, setRect] = useState<Rect | null>(null);

  const measure = useCallback(() => {
    const el = document.querySelector(targetSelector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      x: r.left - padding,
      y: r.top - padding,
      width: r.width + padding * 2,
      height: r.height + padding * 2,
    });
  }, [targetSelector, padding]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const backdropOpacity = theme === "dark" ? 0.3 : 0.5;

  return (
    <svg
      className="fixed inset-0 w-full h-full z-[9998] pointer-events-none"
      style={{ transition: "opacity 0.3s ease" }}
    >
      <defs>
        <mask id="tutorial-spotlight-mask">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {rect && (
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx="8"
              ry="8"
              fill="black"
              style={{ transition: "all 0.3s ease" }}
            />
          )}
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill={`rgba(0,0,0,${backdropOpacity})`}
        mask="url(#tutorial-spotlight-mask)"
      />
      {/* Pulse ring around cutout */}
      {rect && (
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx="8"
          ry="8"
          fill="none"
          className="animate-pulse"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          style={{ transition: "all 0.3s ease" }}
        />
      )}
    </svg>
  );
}
