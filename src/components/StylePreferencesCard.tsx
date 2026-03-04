import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Trash2, RotateCcw } from "lucide-react";
import {
  getStylePreferences,
  deleteStylePreference,
  clearAllStylePreferences,
  type StylePreference,
} from "@/lib/api/stylePreferences";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CATEGORY_LABELS: Record<string, string> = {
  tone: "Tone",
  length: "Length",
  formatting: "Formatting",
  emphasis: "Emphasis",
  vocabulary: "Vocabulary",
  structure: "Structure",
};

const CATEGORY_COLORS: Record<string, string> = {
  tone: "bg-primary/10 text-primary",
  length: "bg-blue-500/10 text-blue-500",
  formatting: "bg-amber-500/10 text-amber-500",
  emphasis: "bg-emerald-500/10 text-emerald-500",
  vocabulary: "bg-violet-500/10 text-violet-500",
  structure: "bg-rose-500/10 text-rose-500",
};

export default function StylePreferencesCard() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<StylePreference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await getStylePreferences();
      setPreferences(data);
    } catch (err: any) {
      console.warn("Failed to load style preferences:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStylePreference(id);
      setPreferences((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Removed", description: "Style preference deleted." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllStylePreferences();
      setPreferences([]);
      toast({ title: "Reset", description: "All learned style preferences cleared." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" /> AI Style Memory
          </CardTitle>
          {preferences.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  <RotateCcw className="h-3 w-3 mr-1" /> Reset All
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all style preferences?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will clear all learned preferences. The AI will start fresh.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll}>Reset All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <CardDescription>
          Preferences learned from your AI refinement interactions. These are automatically applied to future generations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {preferences.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              No preferences learned yet. Use "Refine with AI" on any asset — the AI will learn your style over time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {preferences.map((pref) => (
              <div
                key={pref.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${CATEGORY_COLORS[pref.category] || ""}`}
                    >
                      {CATEGORY_LABELS[pref.category] || pref.category}
                    </Badge>
                    {pref.times_reinforced >= 5 && (
                      <Badge variant="default" className="text-xs">Strong</Badge>
                    )}
                  </div>
                  <p className="text-sm">{pref.preference}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 flex-1 max-w-[120px]">
                      <span className="text-xs text-muted-foreground">Confidence</span>
                      <Progress value={Number(pref.confidence) * 100} className="h-1.5" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Reinforced {pref.times_reinforced}×
                    </span>
                  </div>
                  {pref.source_quote && (
                    <p className="text-xs text-muted-foreground italic truncate">
                      "{pref.source_quote}"
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(pref.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
