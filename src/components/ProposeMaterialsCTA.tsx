import { Button } from "@/components/ui/button";
import { Sparkles, FileText, BarChart3, Shield } from "lucide-react";

interface ProposeMaterialsCTAProps {
  onPropose: () => void;
}

export default function ProposeMaterialsCTA({ onPropose }: ProposeMaterialsCTAProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-4">
      <div className="flex justify-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5">
          <BarChart3 className="h-5 w-5 text-primary" />
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Shield className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div>
        <h3 className="font-heading font-semibold text-base">
          Generate Industry-Specific Materials
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Let AI propose tailored documents for this role — executive reports, roadmaps, 
          competitive analyses, and more. Select 3 to generate.
        </p>
      </div>
      <Button onClick={onPropose} size="lg">
        <Sparkles className="mr-2 h-4 w-4" />
        Propose Materials
      </Button>
    </div>
  );
}
