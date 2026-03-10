/**
 * Shared action bar for all asset tabs (Resume, Cover Letter, Industry Materials).
 * Three-tier hierarchy: Primary (Download PDF) → Secondary (DOCX, Vibe Edit) → Overflow (Edit, Regenerate, etc.)
 * Sticky positioning with backdrop blur so actions remain accessible while scrolling.
 */
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileDown, Edit3, MoreHorizontal, RefreshCw, Copy, History, Loader2,
  Check, X, Lock, Crown, Sparkles, Save,
} from "lucide-react";
import VibeEditInfo from "@/components/VibeEditInfo";
import type { RefinableAssetType } from "@/lib/api/refineAsset";

interface AssetActionBarProps {
  /** Whether the asset has content */
  hasContent: boolean;
  /** Asset type for VibeEditInfo context */
  assetType: RefinableAssetType | "cover_letter" | "dynamic";
  /** Label for display (e.g. "Resume", "Cover Letter") */
  label: string;

  // Primary actions
  onDownloadPdf?: () => void;
  onDownloadDocx?: () => void;
  showDocx?: boolean;

  // Secondary actions
  onVibeEdit?: () => void;
  vibeEditOpen?: boolean;
  canRefine?: boolean;

  // Overflow actions
  onEdit?: () => void;
  isEditing?: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
  onToggleRevisions?: () => void;
  onSaveAsTemplate?: React.ReactNode;

  // State
  isGenerating?: boolean;
  isLocked?: boolean;
  isPreviewOnly?: boolean;
  onUpgradeClick?: () => void;
}

export default function AssetActionBar({
  hasContent,
  assetType,
  label,
  onDownloadPdf,
  onDownloadDocx,
  showDocx = false,
  onVibeEdit,
  vibeEditOpen = false,
  canRefine = true,
  onEdit,
  isEditing = false,
  onRegenerate,
  onCopy,
  onToggleRevisions,
  onSaveAsTemplate,
  isGenerating = false,
  isLocked = false,
  isPreviewOnly = false,
  onUpgradeClick,
}: AssetActionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { threshold: [1], rootMargin: "-1px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={barRef}
      className={`sticky top-0 z-10 flex flex-wrap items-center gap-2 py-2 transition-all ${
        isStuck ? "bg-background/95 backdrop-blur-sm border-b border-border -mx-4 px-4 md:-mx-8 md:px-8" : ""
      }`}
    >
      {/* ─── Primary: Download PDF ─── */}
      {hasContent && onDownloadPdf && (
        isPreviewOnly ? (
          <Button size="sm" className="opacity-75" onClick={onUpgradeClick}>
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
            <Lock className="ml-2 h-3 w-3" />
          </Button>
        ) : (
          <Button data-tutorial="download-btn" size="sm" onClick={onDownloadPdf}>
            <FileDown className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        )
      )}

      {/* ─── Secondary: DOCX ─── */}
      {hasContent && showDocx && onDownloadDocx && (
        <Button variant="outline" size="sm" onClick={onDownloadDocx}>
          <FileDown className="mr-2 h-4 w-4" /> DOCX
        </Button>
      )}

      {/* ─── Secondary: Vibe Edit ─── */}
      {onVibeEdit && (
        isPreviewOnly ? (
          <Button variant="outline" size="sm" className="opacity-75 ml-auto" onClick={onUpgradeClick}>
            <Edit3 className="mr-2 h-4 w-4" /> Vibe Edit
            <Lock className="ml-2 h-3 w-3" />
          </Button>
        ) : (
          <Button
            data-tutorial="refine-ai-btn"
            variant={vibeEditOpen ? "secondary" : "outline"}
            size="sm"
            className="ml-auto"
            onClick={onVibeEdit}
            disabled={!hasContent || !canRefine || isLocked}
          >
            <Edit3 className="mr-2 h-4 w-4" />
            {isLocked ? "Locked" : !canRefine ? "Upgrade to Vibe Edit" : vibeEditOpen ? "Hide Chat" : "Vibe Edit"}
          </Button>
        )
      )}
      {!isPreviewOnly && hasContent && <VibeEditInfo assetType={assetType === "cover_letter" ? "cover_letter" as any : assetType} />}

      {/* ─── Overflow: More menu ─── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Regenerate */}
          {onRegenerate && (
            <DropdownMenuItem
              onClick={onRegenerate}
              disabled={isGenerating || isLocked || isPreviewOnly}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {hasContent ? "Regenerate" : "Generate"} {label}
            </DropdownMenuItem>
          )}

          {/* Edit */}
          {hasContent && onEdit && (
            <DropdownMenuItem onClick={onEdit} disabled={isLocked || isPreviewOnly}>
              <Edit3 className="mr-2 h-4 w-4" />
              {isEditing ? "Cancel Edit" : "Edit Text"}
            </DropdownMenuItem>
          )}

          {/* Copy */}
          {hasContent && onCopy && (
            <DropdownMenuItem onClick={onCopy} disabled={isPreviewOnly}>
              <Copy className="mr-2 h-4 w-4" /> Copy Text
            </DropdownMenuItem>
          )}

          {hasContent && <DropdownMenuSeparator />}

          {/* Revision History toggle */}
          {hasContent && onToggleRevisions && (
            <DropdownMenuItem onClick={onToggleRevisions}>
              <History className="mr-2 h-4 w-4" /> Revision History
            </DropdownMenuItem>
          )}

          {/* Save as Template (render node) */}
          {hasContent && onSaveAsTemplate && (
            <div className="px-2 py-1.5">{onSaveAsTemplate}</div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
