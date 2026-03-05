export interface TutorialStep {
  id: string;
  /** helpRegistry slug this step is derived from */
  helpSlug: string;
  /** CSS selector or data-attribute (data-tutorial="paste-job-url") targeting the UI element to highlight */
  targetSelector: string;
  /** Tooltip text shown inside the bubble */
  title: string;
  body: string;
  /** Placement relative to target: top | bottom | left | right */
  placement: "top" | "bottom" | "left" | "right";
  /** Optional: route the user must be on for this step to render. If user is on wrong route, tutorial auto-navigates. */
  route?: string;
  /** Order within the sequence */
  order: number;
}
