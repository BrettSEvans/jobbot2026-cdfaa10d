import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ArrowLeft, Import, ExternalLink, Globe, SlidersHorizontal } from "lucide-react";
import {
  searchJobs,
  SITE_FILTERS,
  WORK_MODES,
  JOB_TYPES,
  extractCompanyFromUrl,
  type JobSearchResult,
  type SearchFilters,
} from "@/lib/api/jobSearch";
import { saveJobApplication } from "@/lib/api/jobApplication";
import { BRAND } from "@/lib/branding";

const SearchJobs = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [site, setSite] = useState("");
  const [results, setResults] = useState<JobSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [importingUrl, setImportingUrl] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    location: "",
    workMode: "",
    jobType: "",
  });

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const activeFilters: SearchFilters = {
        location: filters.location?.trim() || undefined,
        workMode: filters.workMode || undefined,
        jobType: filters.jobType || undefined,
      };
      const hasFilters = activeFilters.location || activeFilters.workMode || activeFilters.jobType;
      const response = await searchJobs(query, site || undefined, undefined, hasFilters ? activeFilters : undefined);
      if (response.success && response.results) {
        setResults(response.results);
        if (response.results.length === 0) {
          toast({ title: "No results", description: "Try broadening your search or changing the site filter." });
        }
      } else {
        toast({ title: "Search failed", description: response.error || "Unknown error", variant: "destructive" });
        setResults([]);
      }
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Search failed", variant: "destructive" });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (result: JobSearchResult) => {
    setImportingUrl(result.url);
    try {
      const companyName = extractCompanyFromUrl(result.url);
      const saved = await saveJobApplication({
        job_url: result.url,
        job_title: result.title || undefined,
        company_name: companyName || undefined,
        job_description_markdown: result.markdown || undefined,
        generation_status: "idle",
      });
      toast({ title: "Imported!", description: `${result.title || "Job"} added to your applications.` });
      navigate(`/applications/${saved.id}`);
    } catch (err) {
      toast({ title: "Import failed", description: err instanceof Error ? err.message : "Could not import job", variant: "destructive" });
    } finally {
      setImportingUrl(null);
    }
  };

  const activeFilterCount = [filters.location, filters.workMode, filters.jobType].filter(Boolean).length;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground" data-tutorial="search-jobs-title">
            Search Jobs
          </h1>
          <p className="text-sm text-muted-foreground">
            Find job listings across career sites and import them into {BRAND.name}
          </p>
        </div>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3" data-tutorial="search-jobs-form">
        <div className="flex-1">
          <Input
            placeholder="e.g. Senior Software Engineer React"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11"
          />
        </div>
        <Select value={site} onValueChange={setSite}>
          <SelectTrigger className="w-full sm:w-[200px] h-11">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            {SITE_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value || "all"}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={loading || !query.trim()} className="h-11">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Search
        </Button>
      </form>

      {/* Collapsible filters */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <Input
                placeholder="e.g. San Francisco, CA"
                value={filters.location}
                onChange={(e) => setFilters((f) => ({ ...f, location: e.target.value }))}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Work Mode</label>
              <Select
                value={filters.workMode || "any"}
                onValueChange={(v) => setFilters((f) => ({ ...f, workMode: v === "any" ? "" : v as SearchFilters["workMode"] }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_MODES.map((m) => (
                    <SelectItem key={m.value || "any"} value={m.value || "any"}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Job Type</label>
              <Select
                value={filters.jobType || "any"}
                onValueChange={(v) => setFilters((f) => ({ ...f, jobType: v === "any" ? "" : v as SearchFilters["jobType"] }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map((t) => (
                    <SelectItem key={t.value || "any"} value={t.value || "any"}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="mx-auto h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try different keywords or remove the site filter.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
          {results.map((result, idx) => {
            const domain = (() => {
              try { return new URL(result.url).hostname.replace(/^www\./, ""); } catch { return ""; }
            })();
            const isImporting = importingUrl === result.url;

            return (
              <Card key={`${result.url}-${idx}`} className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col sm:flex-row items-start gap-4 p-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="font-semibold text-foreground leading-tight line-clamp-2">
                      {result.title || "Untitled Job"}
                    </h3>
                    {domain && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        {domain}
                      </div>
                    )}
                    {result.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{result.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(result.url, "_blank")}
                      className="flex-1 sm:flex-initial"
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" /> View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleImport(result)}
                      disabled={isImporting}
                      className="flex-1 sm:flex-initial"
                    >
                      {isImporting ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Import className="mr-1 h-3.5 w-3.5" />
                      )}
                      Import
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="mx-auto h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">Search for job listings</p>
          <p className="text-sm mt-1">Enter a job title, company, or keywords above to find openings.</p>
        </div>
      )}
    </div>
  );
};

export default SearchJobs;
