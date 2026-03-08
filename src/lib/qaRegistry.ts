/**
 * Manual QA Test Registry.
 * Mirrors the help registry pattern — register test cases centrally,
 * query them at runtime for the admin QA dashboard.
 */

export interface ManualTestCase {
  id: string;
  title: string;
  area: string;
  route?: string;
  helpSlug?: string;
  preconditions?: string[];
  steps: string[];
  expectedResults: string[];
  tags: string[];
  estimatedMinutes: number;
  requiresAuth: boolean;
  requiresAdmin: boolean;
}

const registry = new Map<string, ManualTestCase>();

export function registerTest(tc: ManualTestCase) {
  registry.set(tc.id, tc);
}

export function getAllTests(): ManualTestCase[] {
  return Array.from(registry.values()).sort((a, b) => a.title.localeCompare(b.title));
}

export function getTestById(id: string): ManualTestCase | undefined {
  return registry.get(id);
}

export function getTestsByArea(area: string): ManualTestCase[] {
  return getAllTests().filter((t) => t.area === area);
}

export function getTestsByTag(tag: string): ManualTestCase[] {
  return getAllTests().filter((t) => t.tags.includes(tag));
}

export function getAllAreas(): string[] {
  return [...new Set(getAllTests().map((t) => t.area))].sort();
}

export function getAllTags(): string[] {
  return [...new Set(getAllTests().flatMap((t) => t.tags))].sort();
}

export function getTotalEstimatedMinutes(tests?: ManualTestCase[]): number {
  return (tests ?? getAllTests()).reduce((sum, t) => sum + t.estimatedMinutes, 0);
}
