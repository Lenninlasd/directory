import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { OpeningHoursRange } from '../domain/openingHours.ts';
import type { Interpretation } from '../interpretation/openingHoursInterpretation.ts';

// The eval of the opening hours prompt (design D-16). Pure functions only: the script in
// `backend/scripts/evalOpeningHours.ts` calls the model, and no test does.

/** One case of the golden set. */
export interface EvalCase {
  name: string;
  /** The week stored for the business, as `interpretOpeningHours` receives it. */
  storedHours: OpeningHoursRange[];
  /** The admin's request, in Spanish. */
  request: string;
  /** The answer a correct interpretation gives. */
  expected: Interpretation;
}

const CASES_FILE = fileURLToPath(new URL('../../eval/openingHours/cases.json', import.meta.url));

/** Reads `backend/eval/openingHours/cases.json`. The cases are checked by `test/eval/scoreCase.test.ts`. */
export function loadEvalCases(path: string = CASES_FILE): EvalCase[] {
  return JSON.parse(readFileSync(path, 'utf8')) as EvalCase[];
}

/** One comparable text per range, sorted, so the order the ranges came in does not matter. */
function weekKey(ranges: OpeningHoursRange[]): string {
  return ranges
    .map((range) => `${range.dayOfWeek} ${range.opens}-${range.closes}`)
    .sort()
    .join(', ');
}

/**
 * Exact match (design D-16): the same `understood`, and when understood, the same ranges in any order.
 * There is no partial credit, since the admin saves the whole week: one wrong day is a wrong answer.
 */
export function scoreCase(expected: Interpretation, actual: Interpretation): boolean {
  if (!expected.understood || !actual.understood) {
    return expected.understood === actual.understood;
  }
  return weekKey(expected.openingHours) === weekKey(actual.openingHours);
}

/** Cost in US dollars of Claude Haiku 5.5 at US$0.10 / US$0.50 per million input / output tokens. */
export function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens * 0.1 + outputTokens * 0.5) / 1_000_000;
}
