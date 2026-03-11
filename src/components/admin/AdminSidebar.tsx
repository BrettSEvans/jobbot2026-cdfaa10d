import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  UserCheck, FileText, FileCode, Users, CreditCard, Gauge, ScrollText, BookOpen, FlaskConical, MessageSquareText, Megaphone, ChevronDown,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface AdminSection {
  id: string;
  label: string;
  icon: React.ElementType;
  group: string;
  requiresAdmin: boolean;
  requiresQA: boolean;
  requiresMarketing: boolean;
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { id: "approvals", label: "Approvals", icon: UserCheck, group: "Operations", requiresAdmin: true, requiresQA: false, requiresMarketing: false },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCard, group: "Operations", requiresAdmin: true, requiresQA: false, requiresMarketing: false },
  { id: "prompts", label: "Prompts", icon: FileText, group: "AI Config", requiresAdmin: true, requiresQA: false, requiresMarketing: false },
  { id: "gen-guide", label: "Gen Guide", icon: FileCode, group: "AI Config", requiresAdmin: true, requiresQA: false, requiresMarketing: false },
  { id: "roles", label: "Roles & Access", icon: Users, group: "Access", requiresAdmin: true, requiresQA: false, requiresMarketing: false },
  { id: "limits", label: "Rate Limits", icon: Gauge, group: "Access", requiresAdmin: true, requiresQA: false, requiresMarketing: false },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, group: "Marketing", requiresAdmin: false, requiresQA: false, requiresMarketing: true },
  { id: "audit", label: "Audit Log", icon: ScrollText, group: "Monitoring", requiresAdmin: true, requiresQA: false, requiresMarketing: false },
  { id: "prompt-log", label: "Prompt Log", icon: MessageSquareText, group: "Monitoring", requiresAdmin: true, requiresQA: false, requiresMarketing: false },
  { id: "qa", label: "QA Testing", icon: FlaskConical, group: "Monitoring", requiresAdmin: false, requiresQA: true, requiresMarketing: false },
  { id: "guide", label: "Guide", icon: BookOpen, group: "Reference", requiresAdmin: true, requiresQA: false, requiresMarketing: false },
];

export function getVisibleSections(isAdmin: boolean, isQA: boolean, isMarketing: boolean): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => {
    if (s.requiresAdmin && !isAdmin) return false;
    if (s.requiresQA && !isQA && !isAdmin) return false;
    if (s.requiresMarketing && !isMarketing && !isAdmin) return false;
    return true;
  });
}

interface MobileAdminNavProps {
  visible: AdminSection[];
  activeSection: string;
  onSectionChange: (id: string) => void;
}

function MobileAdminNav({ visible, activeSection, onSectionChange }: MobileAdminNavProps) {
  const [open, setOpen] = useState(false);
  const active = visible.find((s) => s.id === activeSection);
  const ActiveIcon = active?.icon;
  const groups = [...new Set(visible.map((s) => s.group))];

  return (
    <div className="md:hidden">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex items-center gap-2">
              {ActiveIcon && <ActiveIcon className="h-4 w-4 text-primary" />}
              {active?.label ?? "Menu"}
            </span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-1.5 z-50">
          {groups.map((group) => (
            <div key={group} className="mb-1 last:mb-0">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1.5 pb-0.5">{group}</p>
              {visible.filter((s) => s.group === group).map((s) => {
                const Icon = s.icon;
                const isActive = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => { onSectionChange(s.id); setOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-2.5 rounded-md text-sm font-medium transition-colors text-left min-h-[44px]",
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
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (id: string) => void;
  isAdmin: boolean;
  isQA: boolean;
  isMarketing: boolean;
}

export default function AdminSidebar({ activeSection, onSectionChange, isAdmin, isQA, isMarketing }: AdminSidebarProps) {
  const visible = getVisibleSections(isAdmin, isQA, isMarketing);
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

      {/* Mobile popover nav */}
      <MobileAdminNav
        visible={visible}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />
    </>
  );
}
