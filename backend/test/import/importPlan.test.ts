import { describe, expect, it } from 'vitest';
import type { OpeningHoursRange } from '../../src/domain/openingHours.ts';
import type { HandoffBusiness, HandoffFile } from '../../src/import/handoffFile.ts';
import { countPlan, planImport, type ImportPlan, type StoredBusiness } from '../../src/import/importPlan.ts';

// business-import spec, "Matching stored businesses" and "Opening hours edited in admin mode". Invented businesses.
const weekdays: OpeningHoursRange[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, opens: '08:00', closes: '18:00' }));
const saturday: OpeningHoursRange[] = [{ dayOfWeek: 6, opens: '09:00', closes: '13:00' }];
const edited: OpeningHoursRange[] = [{ dayOfWeek: 1, opens: '07:00', closes: '19:00' }];

function business(placeId: string, overrides: Partial<HandoffBusiness> = {}): HandoffBusiness {
  return {
    name: `Negocio ${placeId}`,
    category: 'Panadería',
    locationSummary: 'Local 1',
    hasPhysicalStore: true,
    whatsappNumber: null,
    websiteUrl: null,
    openingHours: weekdays,
    mapsUrl: null,
    description: null,
    instagramUrl: null,
    private: {
      googlePlaceId: placeId,
      latitude: 10.5,
      longitude: -74.5,
      coordinatesSource: 'maps_listing',
      sourceType: 'storefront',
      sourceCategory: null,
      activityScore: 80,
      activityAsOf: '2026-11-01',
      lastVerifiedAt: null,
      consentedAt: null,
      consentChannel: null,
      adminNotes: null,
    },
    ...overrides,
  };
}

function file(...businesses: HandoffBusiness[]): HandoffFile {
  return { generatedAt: '2026-11-21', businesses };
}

/** The stored row an import of `source` leaves behind, as the repository reads it back. */
function stored(source: HandoffBusiness, overrides: Partial<StoredBusiness> = {}): StoredBusiness {
  const { openingHours, ...rest } = source;
  return {
    ...rest,
    id: `id-${source.private.googlePlaceId}`,
    isActive: true,
    openingHours: JSON.stringify(openingHours),
    importedOpeningHours: JSON.stringify(openingHours),
    ...overrides,
  };
}

/** The place ids of each group, so a test reads as a table. */
function groups(plan: ImportPlan) {
  return {
    added: plan.added.map((write) => write.business.private.googlePlaceId),
    changed: plan.changed.map((write) => write.business.private.googlePlaceId),
    deactivated: plan.deactivated.map((entry) => entry.googlePlaceId),
    reactivated: plan.reactivated.map((write) => write.business.private.googlePlaceId),
    unchanged: plan.unchanged.map((entry) => entry.private.googlePlaceId),
    editedHours: plan.editedHours.map((entry) => entry.googlePlaceId),
  };
}

const none = { added: [], changed: [], deactivated: [], reactivated: [], unchanged: [], editedHours: [] };

describe('planImport: matching stored businesses', () => {
  it('adds a business with a new place id, writing its hours (scenario "A new business")', () => {
    const plan = planImport([], file(business('P1')));

    expect(groups(plan)).toEqual({ ...none, added: ['P1'] });
    expect(plan.added[0]?.writeHours).toBe(true);
  });

  it('leaves a known business unchanged when nothing differs', () => {
    expect(groups(planImport([stored(business('P1'))], file(business('P1'))))).toEqual({ ...none, unchanged: ['P1'] });
  });

  it('changes a known business when a public or a private field differs (scenario "A known business")', () => {
    const plan = planImport(
      [stored(business('P1')), stored(business('P2'))],
      file(business('P1', { name: 'Nuevo nombre' }), business('P2', { private: { ...business('P2').private, activityScore: 40 } })),
    );

    expect(groups(plan)).toEqual({ ...none, changed: ['P1', 'P2'] });
  });

  it('deactivates an active business missing from the file (scenario "A business missing from the file")', () => {
    const plan = planImport([stored(business('P1')), stored(business('P2'))], file(business('P1')));

    expect(groups(plan)).toEqual({ ...none, unchanged: ['P1'], deactivated: ['P2'] });
    expect(plan.deactivated[0]).toEqual({ googlePlaceId: 'P2', name: 'Negocio P2' });
  });

  it('does not deactivate again a business that is already inactive', () => {
    const plan = planImport([stored(business('P2'), { isActive: false })], file());

    expect(groups(plan)).toEqual(none);
  });

  it('reactivates an inactive business that is in the file again (scenario "A business that comes back")', () => {
    const plan = planImport([stored(business('P1'), { isActive: false })], file(business('P1')));

    expect(groups(plan)).toEqual({ ...none, reactivated: ['P1'] });
  });

  it('gives only unchanged businesses when the same file is planned twice (scenario "The same file twice")', () => {
    const source = file(business('P1'), business('P2', { openingHours: [] }), business('P3', { websiteUrl: 'https://example.com/x' }));

    const first = planImport([], source);
    const storedAfterFirst = first.added.map((write) => stored(write.business));
    const second = planImport(storedAfterFirst, source);

    expect(groups(first).added).toEqual(['P1', 'P2', 'P3']);
    expect(groups(second)).toEqual({ ...none, unchanged: ['P1', 'P2', 'P3'] });
  });
});

describe('planImport: opening hours edited in admin mode', () => {
  it('replaces hours that are still the ones the previous import wrote (scenario "Hours not edited")', () => {
    const plan = planImport([stored(business('P1'))], file(business('P1', { openingHours: saturday })));

    expect(groups(plan)).toEqual({ ...none, changed: ['P1'] });
    expect(plan.changed[0]?.writeHours).toBe(true);
  });

  it('keeps hours edited in admin mode and lists the business (scenario "Hours edited in admin mode")', () => {
    const plan = planImport(
      [stored(business('P1'), { openingHours: JSON.stringify(edited) })],
      file(business('P1', { openingHours: saturday })),
    );

    expect(groups(plan)).toEqual({ ...none, unchanged: ['P1'], editedHours: ['P1'] });
    expect(plan.editedHours[0]).toEqual({ googlePlaceId: 'P1', name: 'Negocio P1' });
  });

  it('keeps edited hours while it writes the other changes', () => {
    const plan = planImport(
      [stored(business('P1'), { openingHours: JSON.stringify(edited) })],
      file(business('P1', { name: 'Nuevo nombre' })),
    );

    expect(groups(plan)).toEqual({ ...none, changed: ['P1'], editedHours: ['P1'] });
    expect(plan.changed[0]?.writeHours).toBe(false);
  });

  it('writes both hours again when the edit matches the file, without listing it (scenario "The edit matches the file")', () => {
    const plan = planImport(
      [stored(business('P1'), { openingHours: JSON.stringify(saturday) })],
      file(business('P1', { openingHours: saturday })),
    );

    expect(groups(plan)).toEqual({ ...none, changed: ['P1'] });
    expect(plan.changed[0]?.writeHours).toBe(true);
  });

  it('keeps the edited hours of a business that comes back', () => {
    const plan = planImport(
      [stored(business('P1'), { isActive: false, openingHours: JSON.stringify(edited) })],
      file(business('P1')),
    );

    expect(groups(plan)).toEqual({ ...none, reactivated: ['P1'], editedHours: ['P1'] });
    expect(plan.reactivated[0]?.writeHours).toBe(false);
  });

  it('compares hours as weeks, not as text', () => {
    // The same week, stored with other key order, spacing, and range order.
    const storedText =
      '[{"closes": "18:00", "opens": "08:00", "dayOfWeek": 5}, {"dayOfWeek":1,"opens":"08:00","closes":"18:00"},' +
      ' {"dayOfWeek":2,"opens":"08:00","closes":"18:00"}, {"dayOfWeek":4,"opens":"08:00","closes":"18:00"},' +
      ' {"dayOfWeek":3,"opens":"08:00","closes":"18:00"}]';

    const plan = planImport(
      [stored(business('P1'), { openingHours: storedText, importedOpeningHours: JSON.stringify(weekdays) })],
      file(business('P1')),
    );

    expect(groups(plan)).toEqual({ ...none, unchanged: ['P1'] });
  });
});

describe('countPlan', () => {
  it('counts each group of the plan for the import record (business-import spec, "Import record")', () => {
    const plan = planImport(
      [stored(business('P1')), stored(business('P2')), stored(business('P3'), { isActive: false }), stored(business('P4'))],
      file(business('P1'), business('P2', { name: 'Otro' }), business('P3'), business('P5')),
    );

    expect(countPlan(plan)).toEqual({ added: 1, changed: 1, deactivated: 1, reactivated: 1, unchanged: 1 });
  });
});
