import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit3, RefreshCw, FileCode } from "lucide-react";
import { getSystemDocument, updateSystemDocument } from "@/lib/api/systemDocuments";

export default function AdminGenerationGuideTab() {
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const doc = await getSystemDocument('resume-cover-letter-guide');
      if (doc) {
        setContent(doc.content);
        setOriginalContent(doc.content);
        setTitle(doc.title);
      }
    } catch (err: any) {
      toast({ title: 'Error loading guide', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSystemDocument('resume-cover-letter-guide', { content, title });
      setOriginalContent(content);
      setEditing(false);
      toast({ title: 'Saved', description: 'Generation guide updated. New generations will use this version.' });
    } catch (err: any) {
      toast({ title: 'Error saving', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setContent(originalContent);
    setEditing(false);
  };

  const handleReplace = () => {
    setContent("");
    setEditing(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCode className="h-4 w-4 text-primary" /> Generation Guide
            </CardTitle>
            <CardDescription>
              This document is injected into all resume and cover letter AI prompts. It controls writing strategies, formatting rules, and banned vocabulary.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Edit3 className="h-3.5 w-3.5 mr-1.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={handleReplace}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Replace
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : editing ? (
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Document Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Content (Markdown)</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={24}
                className="mt-1 font-mono text-xs leading-relaxed"
                placeholder="Paste or type the generation guide content here..."
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Save Changes
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDiscard}>Discard</Button>
            </div>
          </div>
        ) : content ? (
          <ScrollArea className="h-[60vh]">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-mono text-muted-foreground pr-4">{content}</pre>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-8">No generation guide configured. Click "Edit" to add one.</p>
        )}
      </CardContent>
    </Card>
  );
}
