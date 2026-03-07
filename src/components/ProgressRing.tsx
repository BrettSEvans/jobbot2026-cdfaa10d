import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export default function ProgressRing({ value, size = 40, strokeWidth = 3.5, className }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;

  return (
    <svg width={size} height={size} className={cn("transform -rotate-90", className)}>
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-500 ease-out"
      />
      {/* Center text */}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-foreground text-[10px] font-semibold transform rotate-90"
        style={{ transformOrigin: "center" }}
      >
        {Math.round(value)}%
      </text>
    </svg>
  );
}
