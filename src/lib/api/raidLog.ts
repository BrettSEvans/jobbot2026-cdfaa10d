import { streamFromEdgeFunction } from './streamUtils';

/**
 * Stream-generate a RAID Log HTML.
 */
export async function streamRaidLog({
  jobDescription,
  companyName,
  jobTitle,
  competitors,
  customers,
  products,
  department,
  branding,
  onDelta,
  onDone,
}: {
  jobDescription: string;
  companyName?: string;
  jobTitle?: string;
  competitors?: string[];
  customers?: string[];
  products?: string[];
  department?: string;
  branding?: any;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  await streamFromEdgeFunction({
    functionName: 'generate-raid-log',
    body: { jobDescription, companyName, jobTitle, competitors, customers, products, department, branding },
    onDelta,
    onDone,
  });
}
