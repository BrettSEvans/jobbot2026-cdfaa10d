export const LABEL_COLORS: Record<string, string> = {
  bug: "0 84% 60%",
  feature: "217 91% 60%",
  design: "270 60% 60%",
  docs: "142 60% 45%",
  refactor: "35 90% 55%",
  test: "199 89% 48%",
  debt: "25 80% 50%",
  ux: "300 50% 55%",
  infra: "180 50% 45%",
  perf: "60 70% 45%",
};

export function getLabelColor(label: string): string {
  const lower = label.toLowerCase();
  if (LABEL_COLORS[lower]) return LABEL_COLORS[lower];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `${hue} 55% 55%`;
}
