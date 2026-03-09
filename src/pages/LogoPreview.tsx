import { cn } from "@/lib/utils";
import logoImg from "@/assets/resuvibe-logo.png";

const sizes = [
  { label: "Option A — 1.25em (current)", em: "1.25em" },
  { label: "Option B — 1.5em", em: "1.5em" },
  { label: "Option C — 1.75em", em: "1.75em" },
  { label: "Option D — 2.0em", em: "2.0em" },
  { label: "Option E — 2.25em", em: "2.25em" },
];

export default function LogoPreview() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-10">
      <h1 className="text-2xl font-heading text-foreground mb-6">Logo Mark Size Comparison</h1>
      {sizes.map((s, i) => (
        <div key={i} className="border border-border rounded-lg p-6 space-y-2">
          <p className="text-sm text-muted-foreground font-medium mb-3">{s.label}</p>
          {/* Simulating header context */}
          <div className="bg-background border-b border-border px-4 py-2 inline-flex items-center gap-1.5 rounded-md">
            <img
              src={logoImg}
              alt="Logo"
              style={{ height: s.em, width: s.em }}
              className="object-contain"
            />
            <span className="font-heading font-bold tracking-tight text-base inline-flex items-center gap-0">
              <span className="text-foreground">Resu</span>
              <span className="relative text-primary" style={{ marginLeft: "-0.15em" }}>
                Vibe
                <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-primary/60" />
              </span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
