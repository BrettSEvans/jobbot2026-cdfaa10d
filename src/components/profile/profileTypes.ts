import { type ReactNode } from "react";

export const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "executive", label: "Executive" },
  { value: "enthusiastic", label: "Enthusiastic" },
  { value: "concise", label: "Concise & Direct" },
];

export const EXPERIENCE_OPTIONS = [
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (3-5 years)" },
  { value: "senior", label: "Senior (6-10 years)" },
  { value: "staff", label: "Staff / Principal (10-15 years)" },
  { value: "executive", label: "Executive (15+ years)" },
];

export interface SaveCardButtonProps {
  cardName: string;
  isDirty: boolean;
  saving: boolean;
  savingCard: string | null;
  onSave: (cardName: string) => void;
}
