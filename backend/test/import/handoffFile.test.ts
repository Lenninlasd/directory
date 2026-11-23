import { describe, expect, it } from 'vitest';
import { checkHandoffFile, formatHandoffProblem, type HandoffProblem } from '../../src/import/handoffFile.ts';

// business-import spec, "Handoff file", "Consent rules", and "All or nothing". Invented businesses only.
type Json = Record<string, unknown>;

function privateFields(overrides: Json = {}): Json {
  return {
    googlePlaceId: 'EXAMPLE_PLACE_ID_1',
    latitude: 10.5,
    longitude: -74.5,
    coordinatesSource: 'maps_listing',
    sourceType: 'storefront',
    sourceCategory: 'Bakery',
    activityScore: 80,
    activityAsOf: '2026-11-01',
    lastVerifiedAt: null,
    consentedAt: null,
    consentChannel: null,
    adminNotes: null,
    ...overrides,
  };
}

function business(overrides: Json = {}, privateOverrides: Json = {}): Json {
  return {
    name: 'Panadería Ejemplo',
    category: 'Panadería',
    locationSummary: 'Local 1, Centro Comercial Ejemplo',
    hasPhysicalStore: true,
    whatsappNumber: null,
    websiteUrl: 'https://example.com/panaderia',
    openingHours: [{ dayOfWeek: 1, opens: '08:00', closes: '18:00' }],
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ejemplo&query_place_id=EXAMPLE_PLACE_ID_1',
    description: 'Pan artesanal.',
    instagramUrl: 'https://www.instagram.com/example.panaderia/',
    private: privateFields(privateOverrides),
    ...overrides,
  };
}

function file(businesses: Json[], overrides: Json = {}): string {
  return JSON.stringify({ generatedAt: '2026-11-21', source: 'google_maps', count: businesses.length, businesses, ...overrides });
}

function problemsOf(text: string): HandoffProblem[] {
  const result = checkHandoffFile(text);
  if (result.valid) {
    throw new Error('Expected the file to be refused');
  }
  return result.problems;
}

function fieldsOf(text: string): string[] {
  return problemsOf(text).map((problem) => problem.field);
}

describe('checkHandoffFile: a valid file', () => {
  it('returns the typed businesses with their values in the stored form', () => {
    const result = checkHandoffFile(
      file([
        business(
          {
            name: '  Panadería Ejemplo ',
            whatsappNumber: '+57 300 123 4567',
            description: '  Pan artesanal. ',
            openingHours: [
              { dayOfWeek: 2, opens: '08:00', closes: '18:00' },
              { dayOfWeek: 1, opens: '08:00', closes: '18:00' },
            ],
          },
          { consentedAt: '2026-11-10', consentChannel: 'whatsapp' },
        ),
      ]),
    );

    expect(result).toEqual({
      valid: true,
      file: {
        generatedAt: '2026-11-21',
        businesses: [
          {
            name: 'Panadería Ejemplo',
            category: 'Panadería',
            locationSummary: 'Local 1, Centro Comercial Ejemplo',
            hasPhysicalStore: true,
            whatsappNumber: '573001234567',
            websiteUrl: 'https://example.com/panaderia',
            openingHours: [
              { dayOfWeek: 1, opens: '08:00', closes: '18:00' },
              { dayOfWeek: 2, opens: '08:00', closes: '18:00' },
            ],
            mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Ejemplo&query_place_id=EXAMPLE_PLACE_ID_1',
            description: 'Pan artesanal.',
            instagramUrl: 'https://www.instagram.com/example.panaderia/',
            private: {
              googlePlaceId: 'EXAMPLE_PLACE_ID_1',
              latitude: 10.5,
              longitude: -74.5,
              coordinatesSource: 'maps_listing',
              sourceType: 'storefront',
              sourceCategory: 'Bakery',
              activityScore: 80,
              activityAsOf: '2026-11-01',
              lastVerifiedAt: null,
              consentedAt: '2026-11-10',
              consentChannel: 'whatsapp',
              adminNotes: null,
            },
          },
        ],
      },
    });
  });

  it('accepts missing optional values and a week without hours', () => {
    const result = checkHandoffFile(
      file([
        business(
          { websiteUrl: null, openingHours: [], mapsUrl: null, description: null, instagramUrl: null },
          { sourceCategory: null },
        ),
      ]),
    );

    expect(result.valid).toBe(true);
  });

  it('accepts a file without businesses', () => {
    expect(checkHandoffFile(file([]))).toEqual({ valid: true, file: { generatedAt: '2026-11-21', businesses: [] } });
  });
});

describe('checkHandoffFile: the file shape', () => {
  it('refuses text that is not JSON', () => {
    expect(problemsOf('{ not json')).toEqual([{ position: null, placeId: null, field: 'file', rule: 'must be valid JSON' }]);
  });

  it('refuses JSON that is not an object', () => {
    expect(fieldsOf('[]')).toEqual(['file']);
  });

  it('refuses an unknown or missing field of the file', () => {
    expect(fieldsOf(file([business()], { extra: 1 }))).toEqual(['extra']);

    const withoutCount = JSON.parse(file([business()])) as Json;
    delete withoutCount.count;
    expect(fieldsOf(JSON.stringify(withoutCount))).toEqual(['count']);
  });

  it('refuses a wrong date, source, or count (scenario "Wrong date, source, or count")', () => {
    expect(fieldsOf(file([business()], { generatedAt: '21/11/2026' }))).toEqual(['generatedAt']);
    expect(fieldsOf(file([business()], { generatedAt: '2026-02-30' }))).toEqual(['generatedAt']);
    expect(fieldsOf(file([business()], { source: 'whatsapp' }))).toEqual(['source']);
    expect(fieldsOf(file([business()], { count: 2 }))).toEqual(['count']);
  });

  it('refuses businesses that are not a list', () => {
    expect(fieldsOf(file([], { businesses: {}, count: 0 }))).toEqual(['businesses']);
  });
});

describe('checkHandoffFile: the fields of a business', () => {
  it('refuses an unknown or missing field of a business', () => {
    expect(fieldsOf(file([business({ rating: 4.5 })]))).toEqual(['rating']);

    const withoutName = business();
    delete withoutName.name;
    expect(fieldsOf(file([withoutName]))).toEqual(['name']);
  });

  it('refuses an unknown or missing field of the private object', () => {
    expect(fieldsOf(file([business({}, { phone: 'x' })]))).toEqual(['private.phone']);

    const missing = business();
    delete (missing.private as Json).adminNotes;
    expect(fieldsOf(file([missing]))).toEqual(['private.adminNotes']);
  });

  it('refuses a business or a private object that is not an object', () => {
    expect(fieldsOf(file(['x' as unknown as Json]))).toEqual(['business']);
    expect(fieldsOf(file([business({ private: null })]))).toEqual(['private']);
  });

  it.each([
    ['name', { name: '   ' }],
    ['category', { category: 7 }],
    ['locationSummary', { locationSummary: null }],
    ['hasPhysicalStore', { hasPhysicalStore: 'yes' }],
    ['whatsappNumber', { whatsappNumber: '123' }],
    ['websiteUrl', { websiteUrl: 'http://example.com' }],
    ['openingHours', { openingHours: [{ dayOfWeek: 1, opens: '18:00', closes: '08:00' }] }],
    ['openingHours', { openingHours: null }],
    ['mapsUrl', { mapsUrl: 'https://example.com/maps/x' }],
    ['description', { description: 'a'.repeat(301) }],
    ['instagramUrl', { instagramUrl: 'https://www.instagram.com/p/abc123/' }],
  ])('refuses an invalid %s', (field, overrides) => {
    expect(fieldsOf(file([business(overrides)]))).toEqual([field]);
  });

  it.each([
    ['private.googlePlaceId', { googlePlaceId: '' }],
    ['private.latitude', { latitude: 91 }],
    ['private.longitude', { longitude: '-74.5' }],
    ['private.coordinatesSource', { coordinatesSource: '' }],
    ['private.sourceType', { sourceType: 'rumor' }],
    ['private.sourceCategory', { sourceCategory: 3 }],
    ['private.activityScore', { activityScore: 80.5 }],
    ['private.activityScore', { activityScore: 101 }],
    ['private.activityAsOf', { activityAsOf: null }],
    ['private.lastVerifiedAt', { lastVerifiedAt: '2026-13-01' }],
    ['private.consentChannel', { consentChannel: 'carrier_pigeon' }],
    ['private.adminNotes', { adminNotes: 12 }],
  ])('refuses an invalid %s', (field, privateOverrides) => {
    expect(fieldsOf(file([business({}, privateOverrides)]))).toEqual([field]);
  });

  it('refuses a repeated place id (scenario "A repeated place id")', () => {
    expect(problemsOf(file([business(), business({ name: 'Otra' })]))).toEqual([
      { position: 2, placeId: 'EXAMPLE_PLACE_ID_1', field: 'private.googlePlaceId', rule: 'must be unique in the file' },
    ]);
  });
});

describe('checkHandoffFile: consent rules', () => {
  it('refuses a WhatsApp number without consent', () => {
    expect(fieldsOf(file([business({ whatsappNumber: '573001234567' })]))).toEqual(['whatsappNumber']);
    expect(
      fieldsOf(file([business({ whatsappNumber: '573001234567' }, { consentedAt: '2026-11-10' })])),
    ).toEqual(['whatsappNumber']);
  });

  it('refuses a private group source without consent', () => {
    expect(fieldsOf(file([business({}, { sourceType: 'private_group', consentChannel: 'in_person' })]))).toEqual([
      'private.sourceType',
    ]);
  });

  it('accepts a WhatsApp number with consent', () => {
    const text = file([business({ whatsappNumber: '573001234567' }, { consentedAt: '2026-11-10', consentChannel: 'phone_call' })]);

    expect(checkHandoffFile(text).valid).toBe(true);
  });
});

describe('checkHandoffFile: all or nothing', () => {
  it('lists the problem of one invalid business among valid ones, with its position and place id', () => {
    const text = file([
      business(),
      business({ websiteUrl: 'ftp://example.com' }, { googlePlaceId: 'EXAMPLE_PLACE_ID_2' }),
      business({}, { googlePlaceId: 'EXAMPLE_PLACE_ID_3' }),
    ]);

    expect(problemsOf(text)).toEqual([
      { position: 2, placeId: 'EXAMPLE_PLACE_ID_2', field: 'websiteUrl', rule: 'must be null or a valid https website' },
    ]);
  });

  it('lists every problem, not only the first', () => {
    const text = file([business({ name: '' }, { latitude: 200 }), business({ mapsUrl: 'x' }, { googlePlaceId: 'EXAMPLE_PLACE_ID_2' })]);

    expect(problemsOf(text).map((problem) => `${problem.position} ${problem.field}`)).toEqual([
      '1 name',
      '1 private.latitude',
      '2 mapsUrl',
    ]);
  });

  it('never puts the invalid value in a problem', () => {
    const secretValues = ['SECRET-NOTE-42', 'http://secret.example.com', '19:45', '31415'];
    const text = file([
      business(
        { websiteUrl: secretValues[1], openingHours: [{ dayOfWeek: 1, opens: secretValues[2], closes: '08:00' }] },
        { adminNotes: 42, sourceCategory: 7, coordinatesSource: '', activityScore: 31415 },
      ),
      business({ rating: secretValues[0] }, { googlePlaceId: 'EXAMPLE_PLACE_ID_2' }),
    ]);

    const messages = problemsOf(text).map(formatHandoffProblem).join('\n');
    for (const value of secretValues) {
      expect(messages).not.toContain(value);
    }
  });

  it('formats a problem with the position, place id, field, and rule', () => {
    expect(
      formatHandoffProblem({ position: 2, placeId: 'EXAMPLE_PLACE_ID_2', field: 'websiteUrl', rule: 'must be null or a valid https website' }),
    ).toBe('Business 2 (place id EXAMPLE_PLACE_ID_2), websiteUrl: must be null or a valid https website');
    expect(formatHandoffProblem({ position: null, placeId: null, field: 'count', rule: 'must equal the number of businesses' })).toBe(
      'File, count: must equal the number of businesses',
    );
  });
});
