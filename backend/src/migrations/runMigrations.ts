/** Runs one SQL statement with optional named parameters (`:name` in the SQL). */
export type ExecuteSql = (sql: string, parameters?: Record<string, string>) => Promise<Record<string, unknown>[]>;

export interface MigrationDatabase {
  execute: ExecuteSql;
  /** Runs `work` in one transaction: commits if it resolves, rolls back and rethrows if it fails. */
  inTransaction<T>(work: (execute: ExecuteSql) => Promise<T>): Promise<T>;
}

export interface MigrationFile {
  name: string;
  sql: string;
}

const CREATE_SCHEMA_MIGRATIONS_SQL =
  'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)';
const SELECT_APPLIED_SQL = 'SELECT name FROM schema_migrations';
const RECORD_APPLIED_SQL = 'INSERT INTO schema_migrations (name) VALUES (:name)';

/**
 * Counts SQL statements, ignoring semicolons inside single-quoted strings,
 * `--` line comments, and `/* *\/` block comments.
 */
export function countStatements(sql: string): number {
  let statements = 0;
  let currentHasContent = false;
  let index = 0;

  while (index < sql.length) {
    const character = sql[index];
    const next = sql[index + 1];

    if (character === '-' && next === '-') {
      const lineEnd = sql.indexOf('\n', index);
      index = lineEnd === -1 ? sql.length : lineEnd + 1;
    } else if (character === '/' && next === '*') {
      const commentEnd = sql.indexOf('*/', index + 2);
      index = commentEnd === -1 ? sql.length : commentEnd + 2;
    } else if (character === "'") {
      currentHasContent = true;
      index += 1;
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2;
        } else if (sql[index] === "'") {
          index += 1;
          break;
        } else {
          index += 1;
        }
      }
    } else if (character === ';') {
      if (currentHasContent) {
        statements += 1;
      }
      currentHasContent = false;
      index += 1;
    } else {
      if (character !== undefined && character.trim() !== '') {
        currentHasContent = true;
      }
      index += 1;
    }
  }

  return currentHasContent ? statements + 1 : statements;
}

/**
 * Applies pending migration files in name order, one statement and one transaction per file
 * (plan 002, P-11). Returns the names of the files applied in this run.
 */
export async function runMigrations(database: MigrationDatabase, files: MigrationFile[]): Promise<string[]> {
  await database.execute(CREATE_SCHEMA_MIGRATIONS_SQL);
  const appliedRecords = await database.execute(SELECT_APPLIED_SQL);
  const alreadyApplied = new Set(appliedRecords.map((record) => String(record.name)));

  const pending = [...files]
    .filter((file) => !alreadyApplied.has(file.name))
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));

  for (const file of pending) {
    const statements = countStatements(file.sql);
    if (statements !== 1) {
      throw new Error(`Migration ${file.name} must contain exactly one SQL statement, found ${statements}`);
    }
  }

  const appliedNow: string[] = [];
  for (const file of pending) {
    try {
      await database.inTransaction(async (execute) => {
        await execute(file.sql);
        await execute(RECORD_APPLIED_SQL, { name: file.name });
      });
    } catch (error) {
      throw new Error(`Migration ${file.name} failed and was rolled back`, { cause: error });
    }
    appliedNow.push(file.name);
  }
  return appliedNow;
}
