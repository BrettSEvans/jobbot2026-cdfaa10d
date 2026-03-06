/**
 * Import Job page — deep-link landing for Chrome Extension.
 * Parses URL params, shows confirmation, creates application.
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, Check, AlertTriangle } from "lucide-react";
import { parseImportParams, importJobExternal } from "@/lib/api/externalImport";
import { useToast } from "@/hooks/use-toast";

export default function ImportJob() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = parseImportParams(searchParams);

  const handleImport = async () => {
    if (!params) return;
    setImporting(true);
    setError(null);

    try {
      const result = await importJobExternal(params);
      toast({ title: "Imported!", description: "Job added to your applications." });
      navigate(`/applications/${result.applicationId}`);
    } catch (err: any) {
      setError(err.message);
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  if (!params) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No job URL provided. Use this page via the browser extension.</p>
            <Button variant="outline" onClick={() => navigate("/")}>Go to Applications</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Import Job
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Source:</span>
              <Badge variant="outline">{params.source}</Badge>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">URL:</span>
              <p className="text-sm font-mono truncate">{params.url}</p>
            </div>
            {params.companyName && (
              <div>
                <span className="text-sm text-muted-foreground">Company:</span>
                <p className="text-sm font-medium">{params.companyName}</p>
              </div>
            )}
            {params.jobTitle && (
              <div>
                <span className="text-sm text-muted-foreground">Role:</span>
                <p className="text-sm font-medium">{params.jobTitle}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 rounded p-2">{error}</div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing} className="flex-1">
              {importing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
              ) : (
                <><Check className="mr-2 h-4 w-4" /> Import & Create Application</>
              )}
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
