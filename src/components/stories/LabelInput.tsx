import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { getLabelColor } from "@/lib/labelColors";

interface LabelInputProps {
  labels: string[];
  onChange: (labels: string[]) => void;
}

export function LabelInput({ labels, onChange }: LabelInputProps) {
  const [input, setInput] = useState("");

  const addLabel = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    if (trimmed && !labels.includes(trimmed)) {
      onChange([...labels, trimmed]);
    }
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addLabel(input);
    }
    if (e.key === "Backspace" && !input && labels.length > 0) {
      onChange(labels.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center rounded-md border border-input bg-background px-2 py-1.5 min-h-[36px]">
      {labels.map((label) => {
        const color = getLabelColor(label);
        return (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-all duration-150"
            style={{ backgroundColor: `hsl(${color} / 0.15)`, color: `hsl(${color})`, border: `1px solid hsl(${color} / 0.3)` }}
          >
            {label}
            <button
              type="button"
              onClick={() => onChange(labels.filter((l) => l !== label))}
              className="hover:opacity-70 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addLabel(input); }}
        placeholder={labels.length === 0 ? "Type label + Enter…" : ""}
        className="border-0 shadow-none p-0 h-6 text-xs flex-1 min-w-[80px] focus-visible:ring-0"
      />
    </div>
  );
}
