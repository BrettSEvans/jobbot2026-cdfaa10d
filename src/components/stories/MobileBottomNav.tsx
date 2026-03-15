import { LayoutList, Columns3, BarChart3 } from "lucide-react";

interface MobileBottomNavProps { activeTab: string; onTabChange: (tab: string) => void; }

const tabs = [
  { value: "sprint", label: "Sprint", icon: LayoutList },
  { value: "kanban", label: "Kanban", icon: Columns3 },
  { value: "charts", label: "Charts", icon: BarChart3 },
];

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border sm:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map(({ value, label, icon: Icon }) => (
          <button key={value} onClick={() => onTabChange(value)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${activeTab === value ? "text-primary" : "text-muted-foreground"}`}>
            <Icon className="h-5 w-5" /><span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
