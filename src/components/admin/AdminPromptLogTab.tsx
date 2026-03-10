import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronDown, ChevronRight, Loader2, MessageSquareText, Copy } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { format } from "date-fns";

interface PromptEntry {
  id: string;
  prompt_number: number;
  prompt_date: string;
  prompt: string;
  category: string;
  outcome: string;
  created_at: string;
}

export default function AdminPromptLogTab() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ prompt: "", category: "", outcome: "", prompt_date: format(new Date(), "yyyy-MM-dd") });

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("prompt_log")
      .select("*")
      .order("prompt_number", { ascending: false });
    if (!error && data) setEntries(data as PromptEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleAdd = async () => {
    if (!form.prompt.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("prompt_log").insert({
      prompt: form.prompt.trim(),
      category: form.category.trim(),
      outcome: form.outcome.trim(),
      prompt_date: form.prompt_date,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Entry added" });
      setForm({ prompt: "", category: "", outcome: "", prompt_date: format(new Date(), "yyyy-MM-dd") });
      setDialogOpen(false);
      fetchEntries();
    }
  };

  const truncate = (s: string, len = 80) => s.length > len ? s.slice(0, len) + "…" : s;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-primary" /> Prompt Log
          </CardTitle>
          <CardDescription>All prompts submitted to Lovable for this project.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Entry
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No prompt entries yet.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead className="w-36">Category</TableHead>
                  <TableHead className="w-48">Outcome</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((e) => {
                  const isExpanded = expandedId === e.id;
                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                    >
                      <TableCell className="font-mono text-xs">{e.prompt_number}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{e.prompt_date}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-start gap-1">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />}
                          <span className={isExpanded ? "" : "line-clamp-1"}>{isExpanded ? e.prompt : truncate(e.prompt)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {e.category && <Badge variant="secondary" className="text-xs font-normal">{e.category}</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{isExpanded ? e.outcome : truncate(e.outcome, 50)}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  navigator.clipboard.writeText(e.prompt);
                                  toast({ title: "Copied to clipboard" });
                                }}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy prompt</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Prompt Log Entry</DialogTitle>
            <DialogDescription>Manually record a prompt submitted to Lovable.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.prompt_date} onChange={(e) => setForm({ ...form, prompt_date: e.target.value })} />
            </div>
            <div>
              <Label>Prompt *</Label>
              <Textarea rows={3} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="The prompt text…" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Bug Fix / UX" />
            </div>
            <div>
              <Label>Outcome</Label>
              <Input value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} placeholder="Brief result description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.prompt.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
