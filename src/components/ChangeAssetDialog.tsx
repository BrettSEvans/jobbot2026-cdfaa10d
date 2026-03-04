/**
 * ChangeAssetDialog - Lets user swap one industry asset for a different AI-proposed type.
 */
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeftRight, Check, Sparkles } from "lucide-react";
import {
  proposeAssets,
  replaceGeneratedAsset,
  type ProposedAsset,
  type GeneratedAsset,
} from "@/lib/api/dynamicAssets";
import { getActiveResumeText } from "@/lib/api/profile";

interface ChangeAssetDialogProps {
  asset: GeneratedAsset;
  /** Names of the other active assets so we exclude them from suggestions */
  otherAssetNames: string[];
  jobDescription: string;
  companyName?: string;
  jobTitle?: string;
  onAssetReplaced: (updated: GeneratedAsset) => void;
  children?: React.ReactNode;
}

export default function ChangeAssetDialog({
  asset,
  otherAssetNames,
  jobDescription,
  companyName,
  jobTitle,
  onAssetReplaced,
  children,
}: ChangeAssetDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ProposedAsset[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && suggestions.length === 0) {
      await fetchSuggestions();
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      let resumeText = "";
      try { resumeText = await getActiveResumeText(); } catch { }

      const results = await proposeAssets({
        jobDescription,
        resumeText,
        companyName,
        jobTitle,
      });

      // Filter out the current asset and other active assets
      const exclude = new Set([asset.asset_name, ...otherAssetNames]);
      const filtered = results.filter((r) => !exclude.has(r.asset_name));
      setSuggestions(filtered.length > 0 ? filtered : results.filter((r) => r.asset_name !== asset.asset_name));
      setSelected(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selected) return;
    const match = suggestions.find((s) => s.asset_name === selected);
    if (!match) return;

    setReplacing(true);
    try {
      const updated = await replaceGeneratedAsset(
        asset.id,
        asset.application_id,
        match.asset_name,
        match.brief_description,
      );
      onAssetReplaced(updated);
      toast({ title: "Asset swapped!", description: `Replaced with "${match.asset_name}". You can now generate it.` });
      setOpen(false);
      setSuggestions([]);
      setSelected(null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setReplacing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <ArrowLeftRight className="mr-2 h-4 w-4" /> Change Asset
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Replace "{asset.asset_name}"
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Choose a different industry-specific document type.
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Finding alternatives...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {suggestions.map((s) => {
                const isSelected = selected === s.asset_name;
                return (
                  <button
                    key={s.asset_name}
                    onClick={() => setSelected(s.asset_name)}
                    className={`text-left p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-foreground/20 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "border-primary bg-primary" : "border-muted-foreground/40"
                      }`}>
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{s.asset_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.brief_description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={fetchSuggestions} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Refresh Options
              </Button>
              <Button size="sm" onClick={handleConfirm} disabled={!selected || replacing}>
                {replacing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeftRight className="mr-2 h-4 w-4" />}
                Swap Asset
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
