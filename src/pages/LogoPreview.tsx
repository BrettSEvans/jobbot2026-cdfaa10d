import logoImg from "@/assets/resuvibe-logo.png";

const sizes = [
  { label: "A", em: "1.25em" },
  { label: "B", em: "1.5em" },
  { label: "C", em: "1.75em" },
  { label: "D", em: "2.0em" },
  { label: "E", em: "2.25em" },
];

export default function LogoPreview() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <h1 className="font-heading text-xl text-foreground">Pick a logo mark size</h1>
      {sizes.map((s) => (
        <div key={s.label} className="border border-border rounded-lg px-6 py-4 flex items-center gap-4">
          <span className="text-sm font-bold text-muted-foreground w-6">{s.label}</span>
          <div className="inline-flex items-center gap-1.5">
            <img src={logoImg} alt="" style={{ height: s.em, width: s.em }} className="object-contain" />
            <span className="font-heading font-bold tracking-tight text-base inline-flex items-center gap-0">
              <span className="text-foreground">Resu</span>
              <span className="text-primary" style={{ marginLeft: "-0.15em" }}>Vibe</span>
            </span>
          </div>
          <span className="text-xs text-muted-foreground ml-4">({s.em})</span>
        </div>
      ))}
    </div>
  );
}
