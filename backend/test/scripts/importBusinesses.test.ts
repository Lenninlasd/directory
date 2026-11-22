import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { DataApi, Execute } from '../../src/db/dataApi.ts';
import { importBusinesses, type ImportDependencies } from '../../scripts/import-businesses.ts';
import type { StackSettings } from '../../scripts/migrate.ts';

// business-import spec, "Import command", "Review in dev before prod", "Import record", and
// "Private fields stay private". Invented businesses only, and no call to AWS.

// Private values that must never be printed (scenario "The command output").
const secret = {
  latitude: 10.987654,
  longitude: -74.123456,
  coordinatesSource: 'pin_privado',
  sourceType: 'owner_published',
  sourceCategory: 'Categoria privada',
  activityScore: 73,
  activityAsOf: '2026-10-15',
  lastVerifiedAt: '2026-10-20',
  consentedAt: '2026-11-10',
  consentChannel: 'in_person',
  adminNotes: 'Nota inventada privada',
};

function business(placeId: string, name: string) {
  return {
    name,
    category: 'Panadería',
    locationSummary: 'Local 1',
    hasPhysicalStore: true,
    whatsappNumber: '573001234567',
    websiteUrl: null,
    openingHours: [{ dayOfWeek: 1, opens: '08:00', closes: '18:00' }],
    mapsUrl: null,
    description: null,
    instagramUrl: null,
    private: { googlePlaceId: placeId, ...secret },
  };
}

const validFile = JSON.stringify({
  generatedAt: '2026-11-21',
  source: 'google_maps',
  count: 2,
  businesses: [business('EXAMPLE_PLACE_ID_1', 'Panadería Uno'), business('EXAMPLE_PLACE_ID_2', 'Panadería Dos')],
});
const validFileHash = createHash('sha256').update(validFile).digest('hex');

// A stored business that is no longer in the file, so a plan has one deactivation.
const storedMissingRecord = {
  id: '00000000-0000-4000-8000-0000000000aa',
  is_active: true,
  name: 'Panadería Vieja',
  category: 'Panadería',
  location_summary: 'Local 9',
  has_physical_store: true,
  whatsapp_number: null,
  website_url: null,
  opening_hours: '[]',
  maps_url: null,
  description: null,
  instagram_url: null,
  google_place_id: 'EXAMPLE_PLACE_ID_9',
  latitude: secret.latitude,
  longitude: secret.longitude,
  coordinates_source: secret.coordinatesSource,
  source_type: 'storefront',
  source_category: null,
  activity_score: secret.activityScore,
  activity_as_of: secret.activityAsOf,
  last_verified_at: null,
  consented_at: null,
  consent_channel: null,
  admin_notes: secret.adminNotes,
  imported_opening_hours: '[]',
};

interface FakeEnvironment {
  database: DataApi;
  executed: string[];
  transactions: number;
}

function fakeEnvironment(options: { stored?: Record<string, unknown>[]; lastImportHash?: string; failWrites?: boolean } = {}) {
  const environment: FakeEnvironment = { database: undefined as unknown as DataApi, executed: [], transactions: 0 };
  const execute: Execute = async (sql) => {
    environment.executed.push(sql.trim());
    if (/FROM businesses\s+WHERE google_place_id IS NOT NULL/.test(sql)) {
      return options.stored ?? [];
    }
    if (/FROM business_imports/.test(sql)) {
      return options.lastImportHash === undefined ? [] : [{ file_sha256: options.lastImportHash, generated_at: '2026-11-21' }];
    }
    if (options.failWrites && /^\s*INSERT INTO businesses/.test(sql)) {
      // A database error can quote the row, so the command must not print it.
      throw new Error(`new row violates check constraint. Failing row contains (${secret.adminNotes}, ${secret.latitude})`);
    }
    return [];
  };
  environment.database = {
    execute,
    inTransaction: async (work) => {
      environment.transactions += 1;
      return work(execute);
    },
  };
  return environment;
}

const writes = (environment: FakeEnvironment) =>
  environment.executed.filter((sql) => /^(INSERT|UPDATE|DELETE)/.test(sql));

function fakeDependencies(
  environments: { dev?: FakeEnvironment; prod?: FakeEnvironment } = {},
  overrides: Partial<ImportDependencies> = {},
) {
  const dev = environments.dev ?? fakeEnvironment();
  const prod = environments.prod ?? fakeEnvironment();
  const output: string[] = [];
  const errors: string[] = [];
  const dependencies: ImportDependencies = {
    readStackSettings: vi.fn(async (stackName: string): Promise<StackSettings> => ({
      clusterArn: `arn:aws:rds:us-east-1:000000000000:cluster:${stackName}-db`,
      secretArn: 'arn:aws:secretsmanager:us-east-1:000000000000:secret:example',
      databaseName: 'alameda',
    })),
    createDatabase: vi.fn((settings: StackSettings) => (settings.clusterArn.includes('alameda-prod') ? prod.database : dev.database)),
    readFile: vi.fn(() => Buffer.from(validFile)),
    askConfirmation: vi.fn(async () => 'prod'),
    log: (line) => output.push(line),
    logError: (line) => errors.push(line),
    ...overrides,
  };
  return { dependencies, dev, prod, output, errors, all: () => [...output, ...errors].join('\n') };
}

function expectNoPrivateValue(text: string) {
  for (const value of [
    String(secret.latitude),
    String(secret.longitude),
    secret.coordinatesSource,
    secret.sourceType,
    secret.sourceCategory,
    secret.activityAsOf,
    secret.lastVerifiedAt,
    secret.consentedAt,
    secret.consentChannel,
    secret.adminNotes,
  ]) {
    expect(text).not.toContain(value);
  }
  expect(text).not.toMatch(/\b73\b/);
}

describe('importBusinesses: wrong arguments (scenario "Wrong arguments")', () => {
  it.each([
    ['no arguments', []],
    ['an unknown environment', ['staging', 'businesses.json']],
    ['a missing file path', ['dev']],
    ['an unknown option', ['dev', 'businesses.json', '--force']],
    ['too many paths', ['dev', 'a.json', 'b.json']],
  ])('prints the usage and reads nothing for %s', async (_case, args) => {
    const { dependencies, errors } = fakeDependencies();

    expect(await importBusinesses(args, dependencies)).toBe(1);
    expect(errors.join('\n')).toContain('Usage: node backend/scripts/import-businesses.ts <dev|prod> <file> [--apply]');
    expect(dependencies.readFile).not.toHaveBeenCalled();
    expect(dependencies.readStackSettings).not.toHaveBeenCalled();
  });

  it('prints the reason and reads no environment when the file cannot be read', async () => {
    const { dependencies, errors } = fakeDependencies(
      {},
      {
        readFile: vi.fn(() => {
          throw new Error("ENOENT: no such file or directory, open 'missing.json'");
        }),
      },
    );

    expect(await importBusinesses(['dev', 'missing.json'], dependencies)).toBe(1);
    expect(errors.join('\n')).toContain('Cannot read missing.json');
    expect(dependencies.readStackSettings).not.toHaveBeenCalled();
  });
});

describe('importBusinesses: a refused file (scenario "One invalid business")', () => {
  it('lists every problem without the values, and reads and writes nothing', async () => {
    const invalid = JSON.parse(validFile) as { businesses: Array<Record<string, unknown>> };
    invalid.businesses[1] = { ...invalid.businesses[1], websiteUrl: 'ftp://secret.example.com' };
    const { dependencies, errors } = fakeDependencies({}, { readFile: vi.fn(() => Buffer.from(JSON.stringify(invalid))) });

    expect(await importBusinesses(['dev', 'businesses.json', '--apply'], dependencies)).toBe(1);
    expect(errors).toContain('Business 2 (place id EXAMPLE_PLACE_ID_2), websiteUrl: must be null or a valid https website');
    expect(errors.join('\n')).toContain('Refused: 1 problem. Nothing was written.');
    expect(errors.join('\n')).not.toContain('secret.example.com');
    expect(dependencies.readStackSettings).not.toHaveBeenCalled();
  });
});

describe('importBusinesses: dev', () => {
  it('prints the plan and writes nothing in a dry run (scenario "Dry run")', async () => {
    const dev = fakeEnvironment({ stored: [storedMissingRecord] });
    const { dependencies, output, all } = fakeDependencies({ dev });

    expect(await importBusinesses(['dev', 'businesses.json'], dependencies)).toBe(0);
    expect(output).toEqual([
      `Checked businesses.json: 2 businesses, generated 2026-11-21, SHA-256 ${validFileHash}`,
      'Plan for dev:',
      '  Added: 2',
      '    Panadería Uno',
      '    Panadería Dos',
      '  Changed: 0',
      '  Reactivated: 0',
      '  Deactivated: 1',
      '    Panadería Vieja',
      '  Unchanged: 0',
      '  Edited hours kept: 0',
      'Dry run: nothing was written. Run again with --apply to write this plan.',
    ]);
    expect(dev.transactions).toBe(0);
    expect(writes(dev)).toEqual([]);
    expectNoPrivateValue(all());
  });

  it('writes the plan and the import record in one transaction (scenarios "Applying a valid file" and "An applied import")', async () => {
    const dev = fakeEnvironment({ stored: [storedMissingRecord] });
    const { dependencies, output, all } = fakeDependencies({ dev });

    expect(await importBusinesses(['dev', 'businesses.json', '--apply'], dependencies)).toBe(0);
    expect(dev.transactions).toBe(1);
    expect(writes(dev).map((sql) => sql.split('\n')[0])).toEqual([
      'INSERT INTO businesses (',
      'INSERT INTO businesses (',
      'UPDATE businesses SET is_active = false',
      'INSERT INTO business_imports (',
    ]);
    expect(output).toContain('    Panadería Vieja');
    expect(output.at(-1)).toBe('Applied to dev.');
    expect(dependencies.askConfirmation).not.toHaveBeenCalled();
    expectNoPrivateValue(all());
  });

  it('exits non-zero, without printing the database message, when a write fails (scenario "A failure while writing")', async () => {
    const dev = fakeEnvironment({ failWrites: true });
    const { dependencies, errors, output, all } = fakeDependencies({ dev });

    expect(await importBusinesses(['dev', 'businesses.json', '--apply'], dependencies)).toBe(1);
    expect(errors.join('\n')).toContain('The import failed and was rolled back. Nothing was written. (Error)');
    expect(output).not.toContain('Applied to dev.');
    expectNoPrivateValue(all());
  });
});

describe('importBusinesses: prod (requirement "Review in dev before prod")', () => {
  it('prints the plan and whether the file matches dev, and asks nothing, in a dry run', async () => {
    const dev = fakeEnvironment({ lastImportHash: validFileHash });
    const prod = fakeEnvironment();
    const { dependencies, output } = fakeDependencies({ dev, prod });

    expect(await importBusinesses(['prod', 'businesses.json'], dependencies)).toBe(0);
    expect(output).toContain('The file matches the last import applied to dev.');
    expect(dependencies.askConfirmation).not.toHaveBeenCalled();
    expect(writes(prod)).toEqual([]);
    expect(writes(dev)).toEqual([]);
  });

  it('lists the businesses whose hours were edited in dev, to repeat in prod admin mode (design, "Risks")', async () => {
    const editedInDev = {
      ...storedMissingRecord,
      name: 'Panadería Uno',
      google_place_id: 'EXAMPLE_PLACE_ID_1',
      whatsapp_number: '573001234567',
      opening_hours: '[{"dayOfWeek": 2, "opens": "07:00", "closes": "19:00"}]',
      imported_opening_hours: '[{"dayOfWeek": 1, "opens": "08:00", "closes": "18:00"}]',
    };
    const dev = fakeEnvironment({ lastImportHash: validFileHash, stored: [editedInDev] });
    const { dependencies, output } = fakeDependencies({ dev });

    expect(await importBusinesses(['prod', 'businesses.json'], dependencies)).toBe(0);
    expect(output.slice(-4)).toEqual([
      'The file matches the last import applied to dev.',
      'Hours edited in dev, to repeat in prod admin mode: 1',
      '    Panadería Uno',
      'Dry run: nothing was written. Run again with --apply to write this plan.',
    ]);
  });

  it('says in a dry run when the file does not match dev', async () => {
    const { dependencies, output } = fakeDependencies({ dev: fakeEnvironment({ lastImportHash: 'f'.repeat(64) }) });

    expect(await importBusinesses(['prod', 'businesses.json'], dependencies)).toBe(0);
    expect(output).toContain('The file does not match the last import applied to dev, so --apply will refuse it.');
  });

  it('applies the file reviewed in dev after the person types prod (scenario "The file reviewed in dev")', async () => {
    const dev = fakeEnvironment({ lastImportHash: validFileHash });
    const prod = fakeEnvironment();
    const { dependencies, output } = fakeDependencies({ dev, prod });

    expect(await importBusinesses(['prod', 'businesses.json', '--apply'], dependencies)).toBe(0);
    expect(dependencies.askConfirmation).toHaveBeenCalledWith("Applying this plan to prod. Type 'prod' to continue: ");
    expect(prod.transactions).toBe(1);
    expect(writes(prod).at(-1)).toMatch(/^INSERT INTO business_imports/);
    expect(writes(dev)).toEqual([]);
    expect(output.at(-1)).toBe('Applied to prod.');
  });

  it.each([
    ['a file that differs from the last dev import', fakeEnvironment({ lastImportHash: 'f'.repeat(64) })],
    ['no import in dev yet', fakeEnvironment()],
  ])('refuses %s before asking, and writes nothing (scenario "Another file")', async (_case, dev) => {
    const prod = fakeEnvironment();
    const { dependencies, errors } = fakeDependencies({ dev, prod });

    expect(await importBusinesses(['prod', 'businesses.json', '--apply'], dependencies)).toBe(1);
    expect(errors.join('\n')).toContain('Refused: prod accepts only the file last applied to dev.');
    expect(dependencies.askConfirmation).not.toHaveBeenCalled();
    expect(prod.transactions).toBe(0);
    expect(writes(prod)).toEqual([]);
  });

  it('stops without changing prod when the person types anything else (scenario "Confirmation not given")', async () => {
    const prod = fakeEnvironment();
    const { dependencies, output } = fakeDependencies(
      { dev: fakeEnvironment({ lastImportHash: validFileHash }), prod },
      { askConfirmation: vi.fn(async () => 'yes') },
    );

    expect(await importBusinesses(['prod', 'businesses.json', '--apply'], dependencies)).toBe(1);
    expect(output.at(-1)).toBe('Stopped. prod was not changed.');
    expect(prod.transactions).toBe(0);
    expect(writes(prod)).toEqual([]);
  });
});
