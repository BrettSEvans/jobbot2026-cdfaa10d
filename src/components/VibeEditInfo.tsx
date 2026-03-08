import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type AssetKey =
  | "dashboard"
  | "cover_letter"
  | "resume"
  | "executive_report"
  | "raid_log"
  | "architecture_diagram"
  | "roadmap"
  | "dynamic";

interface VibeEditInfoProps {
  assetType: string;
}

interface PromptGuide {
  intro: string;
  tips: string[];
  example: string;
}

const GUIDES: Record<AssetKey, PromptGuide> = {
  dashboard: {
    intro: "Your dashboard contains KPI cards, charts, and data tables. Be specific about which element to change.",
    tips: [
      'Reference specific sections: "Update the revenue KPI card..."',
      'Describe the outcome: "...to show quarterly growth as a line chart."',
      'Mention design preferences: "Use a darker color palette with the company brand."',
    ],
    example:
      '"Replace the bar chart in the Market Overview section with a donut chart showing competitor market share percentages. Use the company\'s brand blue as the primary color."',
  },
  cover_letter: {
    intro: "Your cover letter has an opening, body paragraphs, and closing. Tell the AI exactly what to adjust.",
    tips: [
      'Specify tone: "Make the opening more confident and direct."',
      'Focus on content: "Add a paragraph about my leadership experience."',
      'Align with values: "Emphasize the company\'s sustainability mission."',
    ],
    example:
      '"Rewrite the second paragraph to highlight my 5 years of product management experience and tie it to the company\'s focus on customer-driven innovation. Keep the tone professional but enthusiastic."',
  },
  resume: {
    intro: "Your resume includes sections like Experience, Skills, and Education. Point to the section you want refined.",
    tips: [
      'Target sections: "In the Skills section, add Python and AWS."',
      'Optimize bullets: "Make my experience bullets more results-oriented."',
      'Keyword match: "Add keywords from the job description to my summary."',
    ],
    example:
      '"Rewrite the bullet points under my most recent role to emphasize quantifiable outcomes -- revenue impact, team size, and delivery timelines. Add \'stakeholder management\' to the skills list."',
  },
  executive_report: {
    intro: "The executive report has a summary table, strategic analysis, and risk sections. Be precise about which part to modify.",
    tips: [
      'Reference tables: "Update the executive summary table to include..."',
      'Adjust depth: "Expand the risk analysis with mitigation strategies."',
      'Change framing: "Rewrite the opportunity section for a C-suite audience."',
    ],
    example:
      '"Add a new row to the strategic priorities table for \'Digital Transformation\' with a 12-month timeline. In the risk section, add supply-chain disruption as a high-severity risk with a mitigation plan."',
  },
  raid_log: {
    intro: "The RAID log tracks Risks, Assumptions, Issues, and Dependencies. Specify which category and row to change.",
    tips: [
      'Add entries: "Add a new risk about vendor lock-in with high severity."',
      'Modify rows: "Change the status of the API dependency to resolved."',
      'Reframe items: "Rewrite the assumptions to be more conservative."',
    ],
    example:
      '"Add a high-severity risk: \'Key engineer attrition during migration phase\' with mitigation \'Cross-train two backup engineers by Q2\'. Mark the \'Cloud provider SLA\' assumption as validated."',
  },
  architecture_diagram: {
    intro: "The architecture diagram shows system components, data flows, and integrations. Describe structural changes clearly.",
    tips: [
      'Add components: "Add a caching layer between the API and database."',
      'Change flows: "Show the auth service connecting to an external IdP."',
      'Adjust layout: "Group all microservices under a single boundary box."',
    ],
    example:
      '"Add a Redis caching layer between the API Gateway and the PostgreSQL database. Show a new arrow from the Auth Service to an external OAuth provider. Label the data flow with request/response."',
  },
  roadmap: {
    intro: "The roadmap shows milestones, phases, and deliverables on a timeline. Specify what to add, move, or reframe.",
    tips: [
      'Adjust timelines: "Move the beta launch from Q2 to Q3."',
      'Add milestones: "Add a security audit milestone before go-live."',
      'Change scope: "Split Phase 2 into two separate phases."',
    ],
    example:
      '"Add a \'Security & Compliance Audit\' milestone at the end of Q2, before the production launch. Move the \'User Acceptance Testing\' phase to start two weeks earlier. Highlight the critical path in red."',
  },
  dynamic: {
    intro: "This is a custom document. Use the Role, Outcome, Design framework for best results.",
    tips: [
      'Role: "As a senior consultant presenting to the board..."',
      'Outcome: "...create a one-page competitive analysis."',
      'Design: "Use a comparison table with green/red color coding."',
    ],
    example:
      '"As a strategy consultant, restructure this competitive analysis to lead with our three key differentiators. Add a side-by-side comparison table with color-coded ratings (green = strong, red = weak) for each competitor."',
  },
};

export default function VibeEditInfo({ assetType }: VibeEditInfoProps) {
  const key = (Object.keys(GUIDES).includes(assetType) ? assetType : "dynamic") as AssetKey;
  const guide = GUIDES[key];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground">
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">Prompt tips</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm space-y-3" side="bottom" align="start">
        <p className="font-semibold text-foreground">How to write a great Vibe Edit prompt</p>
        <p className="text-muted-foreground">{guide.intro}</p>
        <ul className="space-y-1.5 list-disc pl-4 text-muted-foreground">
          {guide.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
        <div className="rounded-md bg-muted p-2.5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Example prompt</p>
          <p className="text-xs italic text-foreground">{guide.example}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
