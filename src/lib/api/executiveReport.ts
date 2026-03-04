import { streamFromEdgeFunction } from './streamUtils';

/**
 * Stream-generate an executive status report HTML.
 */
export async function streamExecutiveReport({
  jobDescription,
  companyName,
  jobTitle,
  competitors,
  customers,
  products,
  department,
  branding,
  profileContext,
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
  profileContext?: string;
  onDelta: (text: string) => void;
  onDone: () => void;
}) {
  await streamFromEdgeFunction({
    functionName: 'generate-executive-report',
    body: { jobDescription, companyName, jobTitle, competitors, customers, products, department, branding, profileContext },
    onDelta,
    onDone,
  });
}
