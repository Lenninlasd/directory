import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  countStatements,
  runMigrations,
  type ExecuteSql,
  type MigrationDatabase,
  type MigrationFile,
} from '../../src/migrations/runMigrations.ts';

/**
 * In-memory stand-in for the database: statements run inside a transaction
 * only take effect when the transaction commits.
 */
function fakeDatabase(options: { failOn?: string; alreadyApplied?: string[] } = {}) {
  const applied = new Set(options.alreadyApplied ?? []);
  const executed: string[] = [];
  const events: string[] = [];

  const run = (pending: { applied: string[]; executed: string[] } | null): ExecuteSql => async (sql, parameters) => {
    if (options.failOn !== undefined && sql === options.failOn) {
      throw new Error('syntax error');
    }
    if (/^SELECT name FROM schema_migrations/i.test(sql)) {
      return [...applied].map((name) => ({ name }));
    }
    if (/^INSERT INTO schema_migrations/i.test(sql)) {
      const name = parameters?.name;
      if (name === undefined) {
        throw new Error('missing name parameter');
      }
      if (pending) {
        pending.applied.push(name);
      } else {
        applied.add(name);
      }
      return [];
    }
    (pending ? pending.executed : executed).push(sql);
    return [];
  };

  const database: MigrationDatabase = {
    execute: run(null),
    async inTransaction(work) {
      const pending = { applied: [] as string[], executed: [] as string[] };
      events.push('begin');
      try {
        const result = await work(run(pending));
        pending.applied.forEach((name) => applied.add(name));
        executed.push(...pending.executed);
        events.push('commit');
        return result;
      } catch (error) {
        events.push('rollback');
        throw error;
      }
    },
  };

  return { database, applied, executed, events };
}

const createTable: MigrationFile = { name: '001_create_a.sql', sql: 'CREATE TABLE a (id INT);' };
const insertRow: MigrationFile = { name: '002_insert_a.sql', sql: "INSERT INTO a VALUES (1);" };
const createOther: MigrationFile = { name: '003_create_b.sql', sql: 'CREATE TABLE b (id INT);' };

describe('runMigrations', () => {
  it('creates the schema_migrations table if it is missing', async () => {
    const { database, executed } = fakeDatabase();

    await runMigrations(database, []);

    expect(executed[0]).toMatch(/^CREATE TABLE IF NOT EXISTS schema_migrations/);
  });

  it('applies files in name order and records each one', async () => {
    const { database, applied, executed } = fakeDatabase();

    const result = await runMigrations(database, [createOther, createTable, insertRow]);

    expect(result).toEqual(['001_create_a.sql', '002_insert_a.sql', '003_create_b.sql']);
    expect(executed.slice(1)).toEqual([createTable.sql, insertRow.sql, createOther.sql]);
    expect([...applied]).toEqual(['001_create_a.sql', '002_insert_a.sql', '003_create_b.sql']);
  });

  it('runs each file and its record in one transaction', async () => {
    const { database, events } = fakeDatabase();

    await runMigrations(database, [createTable, insertRow]);

    expect(events).toEqual(['begin', 'commit', 'begin', 'commit']);
  });

  it('skips files that were already applied', async () => {
    const { database, executed } = fakeDatabase({ alreadyApplied: ['001_create_a.sql'] });

    const result = await runMigrations(database, [createTable, insertRow]);

    expect(result).toEqual(['002_insert_a.sql']);
    expect(executed).not.toContain(createTable.sql);
  });

  it('is a no-op on a second run', async () => {
    const { database, events } = fakeDatabase();
    await runMigrations(database, [createTable, insertRow]);
    events.length = 0;

    const result = await runMigrations(database, [createTable, insertRow]);

    expect(result).toEqual([]);
    expect(events).toEqual([]);
  });

  it('rolls back a failing file, does not record it, and stops (spec 002 EC-4)', async () => {
    const { database, applied, executed, events } = fakeDatabase({ failOn: insertRow.sql });

    await expect(runMigrations(database, [createTable, insertRow, createOther])).rejects.toThrow(
      /002_insert_a\.sql/,
    );

    expect([...applied]).toEqual(['001_create_a.sql']);
    expect(executed).not.toContain(createOther.sql);
    expect(events).toEqual(['begin', 'commit', 'begin', 'rollback']);
  });

  it('rejects a file with more than one statement before running anything (plan 002, P-11)', async () => {
    const twoStatements: MigrationFile = { name: '002_two.sql', sql: 'CREATE TABLE x (id INT); DROP TABLE a;' };
    const { database, events } = fakeDatabase();

    await expect(runMigrations(database, [createTable, twoStatements])).rejects.toThrow(/002_two\.sql/);

    expect(events).toEqual([]);
  });
});

describe('countStatements', () => {
  it('counts a statement with or without a trailing semicolon', () => {
    expect(countStatements('SELECT 1')).toBe(1);
    expect(countStatements('SELECT 1;\n')).toBe(1);
  });

  it('counts two statements', () => {
    expect(countStatements('SELECT 1; SELECT 2;')).toBe(2);
  });

  it('ignores semicolons inside string literals, including escaped quotes', () => {
    expect(countStatements("INSERT INTO a VALUES ('Café; Bar', 'It''s; fine');")).toBe(1);
  });

  it('ignores semicolons inside comments', () => {
    expect(countStatements('-- first; second\nSELECT 1; /* a; b */')).toBe(1);
  });

  it('counts an empty file as zero statements', () => {
    expect(countStatements('  -- only a comment\n')).toBe(0);
  });
});

describe('migration files in backend/migrations', () => {
  const directory = join(import.meta.dirname, '../../migrations');
  const files = readdirSync(directory).filter((file) => file.endsWith('.sql'));

  it('exist', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s holds exactly one statement', (file) => {
    expect(countStatements(readFileSync(join(directory, file), 'utf8'))).toBe(1);
  });

  it('001_create_businesses.sql creates the businesses table', () => {
    const sql = readFileSync(join(directory, '001_create_businesses.sql'), 'utf8');
    expect(sql).toMatch(/^CREATE TABLE businesses \(/m);
  });
});
