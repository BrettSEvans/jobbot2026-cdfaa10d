import { cn } from "@/lib/utils";
import {
  UserCheck, FileText, FileCode, Users, CreditCard, Gauge, ScrollText, BookOpen, FlaskConical,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface AdminSection {
  id: string;
  label: string;
  icon: React.ElementType;
  group: string;
  requiresAdmin: boolean;
  requiresQA: boolean;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { id: "approvals", label: "Approvals", icon: UserCheck, group: "Operations", requiresAdmin: true, requiresQA: false },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard, group: "Operations", requiresAdmin: true, requiresQA: false },
  { id: "prompts", label: "Prompts", icon: FileText, group: "AI Config", requiresAdmin: true, requiresQA: false },
  { id: "gen-guide", label: "Gen Guide", icon: FileCode, group: "AI Config", requiresAdmin: true, requiresQA: false },
  { id: "roles", label: "Roles & Access", icon: Users, group: "Access", requiresAdmin: true, requiresQA: false },
  { id: "limits", label: "Rate Limits", icon: Gauge, group: "Access", requiresAdmin: true, requiresQA: false },
  { id: "audit", label: "Audit Log", icon: ScrollText, group: "Monitoring", requiresAdmin: true, requiresQA: false },
  { id: "qa", label: "QA Testing", icon: FlaskConical, group: "Monitoring", requiresAdmin: false, requiresQA: true },
  { id: "guide", label: "Guide", icon: BookOpen, group: "Reference", requiresAdmin: true, requiresQA: false },
];

export function getVisibleSections(isAdmin: boolean, isQA: boolean): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => {
    if (s.requiresAdmin && !isAdmin) return false;
    if (s.requiresQA && !isQA && !isAdmin) return false;
    return true;
  });
}

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (id: string) => void;
  isAdmin: boolean;
  isQA: boolean;
}

export default function AdminSidebar({ activeSection, onSectionChange, isAdmin, isQA }: AdminSidebarProps) {
  const visible = getVisibleSections(isAdmin, isQA);
  const groups = [...new Set(visible.map((s) => s.group))];

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:block w-48 shrink-0 space-y-4">
        {groups.map((group) => (
          <div key={group}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">{group}</p>
            <div className="space-y-0.5">
              {visible.filter((s) => s.group === group).map((s) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => onSectionChange(s.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors text-left",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Mobile dropdown */}
      <div className="md:hidden">
        <Select value={activeSection} onValueChange={onSectionChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {visible.map((s) => {
              const Icon = s.icon;
              return (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" /> {s.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
