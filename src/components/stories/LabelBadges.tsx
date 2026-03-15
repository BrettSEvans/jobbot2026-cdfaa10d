import { getLabelColor } from "@/lib/labelColors";

interface LabelBadgesProps {
  labels: string[];
  max?: number;
}

export function LabelBadges({ labels, max = 3 }: LabelBadgesProps) {
  if (!labels || labels.length === 0) return null;
  const shown = labels.slice(0, max);
  const extra = labels.length - max;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {shown.map((label) => {
        const color = getLabelColor(label);
        return (
          <span
            key={label}
            className="rounded-full px-1.5 py-0 text-[9px] font-medium leading-4 transition-all duration-150"
            style={{ backgroundColor: `hsl(${color} / 0.15)`, color: `hsl(${color})` }}
          >
            {label}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="text-[9px] text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
}
