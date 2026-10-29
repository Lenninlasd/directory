import { describe, expect, it, vi } from 'vitest';
import type { MigrationDatabase, MigrationFile } from '../../src/migrations/runMigrations.ts';
import {
  migrate,
  parseStackSettings,
  type MigrateDependencies,
  type StackSettings,
} from '../../scripts/migrate.ts';

const settings: StackSettings = {
  clusterArn: 'arn:aws:rds:us-east-1:000000000000:cluster:alameda-dev-db',
  secretArn: 'arn:aws:secretsmanager:us-east-1:000000000000:secret:rds-db-credentials',
  databaseName: 'alameda',
};

const createTable: MigrationFile = { name: '001_create_a.sql', sql: 'CREATE TABLE a (id INT);' };
const insertRow: MigrationFile = { name: '002_insert_a.sql', sql: 'INSERT INTO a VALUES (1);' };
const seed: MigrationFile = { name: 'dev_businesses.sql', sql: 'INSERT INTO a VALUES (2);' };

/** Fake Data API wrapper: nothing is recorded as applied, and `failOn` makes that SQL throw. */
function fakeDatabase(options: { failOn?: string; alreadyApplied?: string[] } = {}) {
  const executed: string[] = [];
  const execute = async (sql: string) => {
    if (sql === options.failOn) {
      throw new Error('syntax error at or near "INSERT"');
    }
    executed.push(sql);
    return /^SELECT name FROM schema_migrations/.test(sql)
      ? (options.alreadyApplied ?? []).map((name) => ({ name }))
      : [];
  };
  const database: MigrationDatabase = { execute, inTransaction: (work) => work(execute) };
  return { database, executed };
}

function fakeDependencies(database: MigrationDatabase, overrides: Partial<MigrateDependencies> = {}) {
  const output: string[] = [];
  const errors: string[] = [];
  const dependencies: MigrateDependencies = {
    readStackSettings: vi.fn(async () => settings),
    createDatabase: vi.fn(() => database),
    readMigrationFiles: () => [createTable, insertRow],
    readSeedFile: () => seed,
    log: (line) => output.push(line),
    logError: (line) => errors.push(line),
    ...overrides,
  };
  return { dependencies, output, errors };
}

describe('migrate arguments', () => {
  it('rejects a missing environment without reading the stack', async () => {
    const { dependencies, errors } = fakeDependencies(fakeDatabase().database);

    expect(await migrate([], dependencies)).toBe(1);

    expect(errors.join('\n')).toMatch(/Usage: node backend\/scripts\/migrate\.ts <dev\|prod> \[--seed\]/);
    expect(dependencies.readStackSettings).not.toHaveBeenCalled();
  });

  it('rejects an unknown environment', async () => {
    const { dependencies, errors } = fakeDependencies(fakeDatabase().database);

    expect(await migrate(['staging'], dependencies)).toBe(1);

    expect(errors.join('\n')).toMatch(/Unknown environment "staging"/);
    expect(dependencies.readStackSettings).not.toHaveBeenCalled();
  });

  it('rejects an unknown option', async () => {
    const { dependencies, errors } = fakeDependencies(fakeDatabase().database);

    expect(await migrate(['dev', '--force'], dependencies)).toBe(1);

    expect(errors.join('\n')).toMatch(/Unknown option "--force"/);
    expect(dependencies.readStackSettings).not.toHaveBeenCalled();
  });

  it('refuses --seed for prod before touching the stack or the database (spec 002 AC-7.3)', async () => {
    const { dependencies, errors } = fakeDependencies(fakeDatabase().database);

    expect(await migrate(['prod', '--seed'], dependencies)).toBe(1);

    expect(errors.join('\n')).toMatch(/--seed is only allowed for dev/);
    expect(dependencies.readStackSettings).not.toHaveBeenCalled();
    expect(dependencies.createDatabase).not.toHaveBeenCalled();
  });
});

describe('migrate', () => {
  it('reads the settings of the environment stack and lists the applied files', async () => {
    const { database } = fakeDatabase();
    const { dependencies, output } = fakeDependencies(database);

    expect(await migrate(['dev'], dependencies)).toBe(0);

    expect(dependencies.readStackSettings).toHaveBeenCalledWith('alameda-dev');
    expect(dependencies.createDatabase).toHaveBeenCalledWith(settings);
    expect(output).toEqual(['Applied 001_create_a.sql', 'Applied 002_insert_a.sql']);
  });

  it('says so when there is nothing to apply', async () => {
    const { database } = fakeDatabase({ alreadyApplied: ['001_create_a.sql', '002_insert_a.sql'] });
    const { dependencies, output } = fakeDependencies(database);

    expect(await migrate(['prod'], dependencies)).toBe(0);

    expect(dependencies.readStackSettings).toHaveBeenCalledWith('alameda-prod');
    expect(output).toEqual(['No pending migrations']);
  });

  it('exits with a non-zero code and names the file when a migration fails (spec 002 EC-4)', async () => {
    const { database, executed } = fakeDatabase({ failOn: insertRow.sql });
    const { dependencies, errors } = fakeDependencies(database);

    expect(await migrate(['dev', '--seed'], dependencies)).toBe(1);

    expect(errors.join('\n')).toMatch(/002_insert_a\.sql failed and was rolled back/);
    expect(errors.join('\n')).toMatch(/syntax error at or near "INSERT"/);
    expect(executed).not.toContain(seed.sql);
  });

  it('exits with a non-zero code when the stack cannot be read', async () => {
    const { dependencies, errors } = fakeDependencies(fakeDatabase().database, {
      readStackSettings: vi.fn(async () => {
        throw new Error('Stack with id alameda-dev does not exist');
      }),
    });

    expect(await migrate(['dev'], dependencies)).toBe(1);

    expect(errors.join('\n')).toMatch(/Stack with id alameda-dev does not exist/);
  });

  it('runs the seed after the migrations with --seed in dev (spec 002 Q-9)', async () => {
    const { database, executed } = fakeDatabase();
    const { dependencies, output } = fakeDependencies(database);

    expect(await migrate(['dev', '--seed'], dependencies)).toBe(0);

    expect(executed.at(-1)).toBe(seed.sql);
    expect(output.at(-1)).toBe('Seeded dev_businesses.sql');
  });

  it('rejects a seed file with more than one statement before running it', async () => {
    const { database, executed } = fakeDatabase();
    const { dependencies, errors } = fakeDependencies(database, {
      readSeedFile: () => ({ name: 'dev_businesses.sql', sql: 'DELETE FROM a; INSERT INTO a VALUES (2);' }),
    });

    expect(await migrate(['dev', '--seed'], dependencies)).toBe(1);

    expect(errors.join('\n')).toMatch(/dev_businesses\.sql must contain exactly one SQL statement/);
    expect(executed.some((sql) => sql.startsWith('DELETE'))).toBe(false);
  });
});

describe('parseStackSettings', () => {
  const describeStacksOutput = {
    Stacks: [
      {
        Parameters: [
          { ParameterKey: 'Environment', ParameterValue: 'dev' },
          { ParameterKey: 'DatabaseName', ParameterValue: 'alameda' },
        ],
        Outputs: [
          { OutputKey: 'Environment', OutputValue: 'dev' },
          { OutputKey: 'ClusterArn', OutputValue: settings.clusterArn },
          { OutputKey: 'SecretArn', OutputValue: settings.secretArn },
        ],
      },
    ],
  };

  it('reads the cluster ARN, secret ARN, and database name from describe-stacks JSON', () => {
    expect(parseStackSettings(JSON.stringify(describeStacksOutput))).toEqual(settings);
  });

  it('fails with a clear message when an output is missing', () => {
    const [stack] = describeStacksOutput.Stacks;
    const withoutSecret = {
      Stacks: [{ ...stack, Outputs: stack?.Outputs.filter((output) => output.OutputKey !== 'SecretArn') }],
    };

    expect(() => parseStackSettings(JSON.stringify(withoutSecret))).toThrow('Stack output SecretArn is missing');
  });
});
