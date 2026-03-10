/**
 * AssetProposalCard - Shows AI-proposed document types for user selection.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Check, FileText } from "lucide-react";
import {
  proposeAssets,
  saveProposedAssets,
  confirmAssetSelection,
  type ProposedAsset,
  type GeneratedAsset,
} from "@/lib/api/dynamicAssets";
import { getActiveResumeText } from "@/lib/api/profile";

interface AssetProposalCardProps {
  applicationId: string;
  jobDescription: string;
  companyName?: string;
  jobTitle?: string;
  onAssetsConfirmed: (assets: GeneratedAsset[]) => void;
}

export default function AssetProposalCard({
  applicationId,
  jobDescription,
  companyName,
  jobTitle,
  onAssetsConfirmed,
}: AssetProposalCardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState<ProposedAsset[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const handlePropose = async () => {
    if (!jobDescription.trim()) {
      toast({ title: "Missing info", description: "A job description is needed to propose materials.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let resumeText = "";
      try { resumeText = await getActiveResumeText(); } catch { /* non-critical */ }

      const results = await proposeAssets({
        jobDescription,
        resumeText,
        companyName,
        jobTitle,
      });
      setProposals(results);
      setSelected(new Set());
      await saveProposedAssets(applicationId, results);
      toast({ title: "Materials proposed!", description: "Select the document types you'd like to generate." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else if (next.size < 3) {
        next.add(name);
      } else {
        toast({ title: "Limit reached", description: "You've reached the selection limit.", variant: "destructive" });
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selected.size !== 3) {
      toast({ title: "Selection required", description: "Please select the required number of document types.", variant: "destructive" });
      return;
    }
    setConfirming(true);
    try {
      const assets = await confirmAssetSelection(applicationId, Array.from(selected));
      onAssetsConfirmed(assets);
      toast({ title: "Selection confirmed!", description: "Generating your 3 documents..." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-4">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <h3 className="font-semibold text-lg">Industry-Specific Materials</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Let AI analyze the job and propose 6 professional documents tailored to this role and industry.
            </p>
          </div>
          <Button onClick={handlePropose} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Propose Materials
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Select 3 Document Types</CardTitle>
          <Badge variant="outline">{selected.size}/3 selected</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Choose exactly 3 documents to generate for this application.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {proposals.map((p) => {
            const isSelected = selected.has(p.asset_name);
            return (
              <button
                key={p.asset_name}
                onClick={() => toggleSelection(p.asset_name)}
                className={`text-left p-4 rounded-lg border-2 transition-all ${
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
                    <p className="font-medium text-sm">{p.asset_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.brief_description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handlePropose} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Re-propose
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={selected.size !== 3 || confirming}>
            {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Selected ({selected.size}/3)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
