import { describe, expect, it } from 'vitest';
import { validateOpeningHoursForWriting, type OpeningHoursRange } from '../../src/domain/openingHours.ts';
import { loadEvalCases, scoreCase } from '../../src/eval/openingHoursEval.ts';
import { SYSTEM_PROMPT } from '../../src/interpretation/openingHoursPrompt.ts';

// Design D-16: the golden set and its exact-match score. The script that calls the model is not tested
// here, and `pnpm -r test` never runs it, since no test may call the Anthropic API.

const saturdayUntilTwo: OpeningHoursRange[] = [
  ...[1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, opens: '08:00', closes: '18:00' })),
  { dayOfWeek: 6, opens: '08:00', closes: '14:00' },
];

describe('scoreCase', () => {
  it('passes an exact match', () => {
    expect(
      scoreCase({ understood: true, openingHours: saturdayUntilTwo }, { understood: true, openingHours: saturdayUntilTwo }),
    ).toBe(true);
  });

  it('passes the same week in another order', () => {
    expect(
      scoreCase(
        { understood: true, openingHours: saturdayUntilTwo },
        { understood: true, openingHours: [...saturdayUntilTwo].reverse() },
      ),
    ).toBe(true);
  });

  it('fails a different range', () => {
    const wrongSaturday = [...saturdayUntilTwo.slice(0, 5), { dayOfWeek: 6, opens: '08:00', closes: '02:00' }];

    expect(
      scoreCase({ understood: true, openingHours: saturdayUntilTwo }, { understood: true, openingHours: wrongSaturday }),
    ).toBe(false);
  });

  it('fails a missing or an extra range', () => {
    const expected = { understood: true as const, openingHours: saturdayUntilTwo };

    expect(scoreCase(expected, { understood: true, openingHours: saturdayUntilTwo.slice(1) })).toBe(false);
    expect(
      scoreCase(expected, {
        understood: true,
        openingHours: [...saturdayUntilTwo, { dayOfWeek: 7, opens: '09:00', closes: '12:00' }],
      }),
    ).toBe(false);
  });

  it('fails when understood differs, both ways', () => {
    expect(scoreCase({ understood: false }, { understood: true, openingHours: saturdayUntilTwo })).toBe(false);
    expect(scoreCase({ understood: true, openingHours: saturdayUntilTwo }, { understood: false })).toBe(false);
  });

  it('passes two answers that were not understood', () => {
    expect(scoreCase({ understood: false }, { understood: false })).toBe(true);
  });
});

describe('the golden set (backend/eval/openingHours/cases.json)', () => {
  const cases = loadEvalCases();

  it('has about 20 cases with unique names', () => {
    expect(cases.length).toBeGreaterThanOrEqual(18);
    expect(new Set(cases.map((evalCase) => evalCase.name)).size).toBe(cases.length);
  });

  it.each(cases.map((evalCase) => [evalCase.name, evalCase] as const))(
    '"%s" has a valid stored week and, when understood, a valid expected week',
    (_name, evalCase) => {
      expect(validateOpeningHoursForWriting(evalCase.storedHours)).toMatchObject({ valid: true });
      expect(evalCase.request.trim()).not.toBe('');
      expect(evalCase.request.length).toBeLessThanOrEqual(300);
      if (evalCase.expected.understood) {
        expect(validateOpeningHoursForWriting(evalCase.expected.openingHours)).toMatchObject({ valid: true });
      }
    },
  );

  it('never uses a request that is in the system prompt, so its examples do not inflate the score', () => {
    const prompt = SYSTEM_PROMPT.toLowerCase();

    for (const evalCase of cases) {
      expect(prompt, evalCase.name).not.toContain(evalCase.request.toLowerCase());
    }
  });

  it('covers both cases the prompt does not name: one day with no hours, and open 24 hours', () => {
    const noHours = cases.find((evalCase) => evalCase.request === 'los sábados cerramos a las 2');
    const allDay = cases.find(
      (evalCase) => evalCase.request === 'abiertos 24 horas' && evalCase.storedHours.length === 0,
    );

    expect(noHours).toMatchObject({ storedHours: [], expected: { understood: false } });
    expect(allDay?.expected).toEqual({
      understood: true,
      openingHours: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({ dayOfWeek, opens: '00:00', closes: '24:00' })),
    });
  });

  it('pins "24 horas" from both sides: closed days stay closed unless the request names them', () => {
    const closedDaysKept = cases.find(
      (evalCase) => evalCase.request === 'abiertos 24 horas' && evalCase.storedHours.length > 0,
    );
    const everyDay = cases.find((evalCase) => evalCase.request === 'abierto 24 horas todos los dias');

    expect(closedDaysKept?.storedHours.some((range) => range.dayOfWeek === 7)).toBe(false);
    expect(closedDaysKept?.expected).toEqual({
      understood: true,
      openingHours: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, opens: '00:00', closes: '24:00' })),
    });
    expect(everyDay?.expected).toEqual({
      understood: true,
      openingHours: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({ dayOfWeek, opens: '00:00', closes: '24:00' })),
    });
  });
});
