import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { execFile } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createDataApi } from '../src/db/dataApi.ts';
import {
  countStatements,
  runMigrations,
  type MigrationDatabase,
  type MigrationFile,
} from '../src/migrations/runMigrations.ts';

/**
 * Applies `backend/migrations/*.sql` to one environment through the RDS Data API, with the developer's
 * AWS credentials (spec 002 AC-5.2a, plan P-10). `--seed` also runs the `dev` seed.
 *
 * Usage: node backend/scripts/migrate.ts <dev|prod> [--seed]
 */

const REGION = 'us-east-1';
const ENVIRONMENTS = ['dev', 'prod'];
const USAGE = 'Usage: node backend/scripts/migrate.ts <dev|prod> [--seed]';

export interface StackSettings {
  clusterArn: string;
  secretArn: string;
  databaseName: string;
}

export interface MigrateDependencies {
  readStackSettings(stackName: string): Promise<StackSettings>;
  createDatabase(settings: StackSettings): MigrationDatabase;
  readMigrationFiles(): MigrationFile[];
  readSeedFile(): MigrationFile;
  log(line: string): void;
  logError(line: string): void;
}

interface DescribeStacksOutput {
  Stacks?: Array<{
    Parameters?: Array<{ ParameterKey?: string; ParameterValue?: string }>;
    Outputs?: Array<{ OutputKey?: string; OutputValue?: string }>;
  }>;
}

/** Reads the settings this script needs from `aws cloudformation describe-stacks` JSON output. */
export function parseStackSettings(describeStacksJson: string): StackSettings {
  const [stack] = (JSON.parse(describeStacksJson) as DescribeStacksOutput).Stacks ?? [];

  function output(key: string): string {
    const value = stack?.Outputs?.find((entry) => entry.OutputKey === key)?.OutputValue;
    if (!value) {
      throw new Error(`Stack output ${key} is missing`);
    }
    return value;
  }

  const databaseName = stack?.Parameters?.find((entry) => entry.ParameterKey === 'DatabaseName')?.ParameterValue;
  if (!databaseName) {
    throw new Error('Stack parameter DatabaseName is missing');
  }

  return { clusterArn: output('ClusterArn'), secretArn: output('SecretArn'), databaseName };
}

/** The error message plus the messages of its causes, for example the SQL error behind a failed migration. */
function describeError(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  while (current !== undefined) {
    messages.push(current instanceof Error ? current.message : String(current));
    current = current instanceof Error ? current.cause : undefined;
  }
  return messages.join(': ');
}

/** Runs the command and returns the process exit code. */
export async function migrate(args: string[], dependencies: MigrateDependencies): Promise<number> {
  const [environment, ...options] = args;

  if (environment === undefined) {
    dependencies.logError(USAGE);
    return 1;
  }
  if (!ENVIRONMENTS.includes(environment)) {
    dependencies.logError(`Unknown environment "${environment}". ${USAGE}`);
    return 1;
  }
  const unknownOption = options.find((option) => option !== '--seed');
  if (unknownOption !== undefined) {
    dependencies.logError(`Unknown option "${unknownOption}". ${USAGE}`);
    return 1;
  }
  const seed = options.includes('--seed');
  if (seed && environment !== 'dev') {
    dependencies.logError('--seed is only allowed for dev (spec 002 AC-7.3)');
    return 1;
  }

  try {
    const database = dependencies.createDatabase(await dependencies.readStackSettings(`alameda-${environment}`));

    const applied = await runMigrations(database, dependencies.readMigrationFiles());
    if (applied.length === 0) {
      dependencies.log('No pending migrations');
    }
    applied.forEach((name) => dependencies.log(`Applied ${name}`));

    if (seed) {
      const seedFile = dependencies.readSeedFile();
      const statements = countStatements(seedFile.sql);
      if (statements !== 1) {
        throw new Error(`Seed ${seedFile.name} must contain exactly one SQL statement, found ${statements}`);
      }
      await database.execute(seedFile.sql);
      dependencies.log(`Seeded ${seedFile.name}`);
    }
    return 0;
  } catch (error) {
    dependencies.logError(describeError(error));
    return 1;
  }
}

const backendDirectory = join(import.meta.dirname, '..');

function readSqlFile(path: string): MigrationFile {
  return { name: path.split('/').at(-1) ?? path, sql: readFileSync(path, 'utf8') };
}

const dependencies: MigrateDependencies = {
  async readStackSettings(stackName) {
    const { stdout } = await promisify(execFile)('aws', [
      'cloudformation',
      'describe-stacks',
      '--stack-name',
      stackName,
      '--region',
      REGION,
      '--output',
      'json',
    ]);
    return parseStackSettings(stdout);
  },
  createDatabase: (settings) =>
    createDataApi(
      { resourceArn: settings.clusterArn, secretArn: settings.secretArn, database: settings.databaseName },
      new RDSDataClient({ region: REGION }),
    ),
  readMigrationFiles: () =>
    readdirSync(join(backendDirectory, 'migrations'))
      .filter((file) => file.endsWith('.sql'))
      .map((file) => readSqlFile(join(backendDirectory, 'migrations', file))),
  readSeedFile: () => readSqlFile(join(backendDirectory, 'seeds', 'dev_businesses.sql')),
  log: (line) => console.log(line),
  logError: (line) => console.error(line),
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await migrate(process.argv.slice(2), dependencies);
}
