import { performance } from 'node:perf_hooks';
import type { OpeningHoursRange } from '../src/domain/openingHours.ts';
import { estimateCost, loadEvalCases, scoreCase } from '../src/eval/openingHoursEval.ts';
import { createAnthropicClient } from '../src/handlers/lambda.ts';
import {
  InterpretationUnavailable,
  interpretOpeningHours,
  MODEL,
  type CallModel,
  type Interpretation,
} from '../src/interpretation/openingHoursInterpretation.ts';
import { PROMPT_VERSION } from '../src/interpretation/openingHoursPrompt.ts';

/**
 * Runs the golden set of `backend/eval/openingHours/cases.json` against the real model, with the real
 * prompt, schema, validation, and client settings (design D-16). Each case is one billed call; the whole
 * set costs about US$0.01 (25 calls of about 900 input and 150 output tokens at US$0.10 / US$0.50 per
 * million tokens).
 *
 * It is never run by `pnpm -r test` or CI: no test may call the Anthropic API. The key only lives in
 * your shell, never in a file:
 *
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   node backend/scripts/evalOpeningHours.ts
 *
 * It prints pass or fail per case, the exact-match accuracy, the tokens, and the cost. A wrong answer is
 * material for the next prompt version: add a rule, move `PROMPT_VERSION` to `opening-hours-v2`, and run
 * the eval again, instead of changing the prompt before measuring (task 5.1).
 */

function describeWeek(interpretation: Interpretation): string {
  if (!interpretation.understood) {
    return 'not understood';
  }
  if (interpretation.openingHours.length === 0) {
    return 'no hours';
  }
  return interpretation.openingHours
    .map((range: OpeningHoursRange) => `${range.dayOfWeek} ${range.opens}-${range.closes}`)
    .join(', ');
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Set ANTHROPIC_API_KEY in this shell first: export ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

// The same client as the Lambda (design D-11): a 7-second timeout and no retries.
const client = createAnthropicClient(apiKey);
const callModel: CallModel = (params) => client.messages.create(params);
const cases = loadEvalCases();

console.log(`Eval of ${PROMPT_VERSION} on ${MODEL}: ${cases.length} cases\n`);

let passed = 0;
let inputTokens = 0;
let outputTokens = 0;
const started = performance.now();

// One case at a time, so the output reads in order and no rate limit is hit.
for (const evalCase of cases) {
  try {
    const result = await interpretOpeningHours(
      { storedHours: evalCase.storedHours, request: evalCase.request },
      callModel,
    );
    inputTokens += result.usage.inputTokens;
    outputTokens += result.usage.outputTokens;
    const ok = scoreCase(evalCase.expected, result.interpretation);
    passed += ok ? 1 : 0;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${evalCase.name}`);
    if (!ok) {
      console.log(`      request:  "${evalCase.request}"`);
      console.log(`      expected: ${describeWeek(evalCase.expected)}`);
      console.log(`      actual:   ${describeWeek(result.interpretation)}`);
    }
  } catch (error) {
    // An answer the route would turn into 503 counts as a failure, with its cause.
    if (!(error instanceof InterpretationUnavailable)) {
      throw error;
    }
    console.log(`FAIL  ${evalCase.name}`);
    console.log(`      unavailable: ${error.message}`, error.cause ?? '');
  }
}

const seconds = ((performance.now() - started) / 1000).toFixed(1);
const accuracy = ((passed / cases.length) * 100).toFixed(1);
console.log(
  `\nAccuracy: ${passed}/${cases.length} (${accuracy}%) · tokens ${inputTokens} in / ${outputTokens} out · ` +
    `US$${estimateCost(inputTokens, outputTokens).toFixed(4)} · ${seconds} s · ${PROMPT_VERSION}`,
);
