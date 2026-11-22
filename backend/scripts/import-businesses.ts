import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { createDataApi, type DataApi } from '../src/db/dataApi.ts';
import { checkHandoffFile, formatHandoffProblem } from '../src/import/handoffFile.ts';
import { countPlan, planImport, type ImportPlan } from '../src/import/importPlan.ts';
import {
  deactivateImportedBusiness,
  findImportedBusinesses,
  findLastImport,
  recordImport,
  upsertImportedBusiness,
} from '../src/repositories/importRepository.ts';
import { describeError, readStackSettingsWithAwsCli, REGION, type StackSettings } from './migrate.ts';

/**
 * Loads the pipeline's handoff file into one environment through the RDS Data API, with the developer's AWS
 * credentials (business-import spec, "Import command"; import-businesses design D-1, D-2, D-5). Without `--apply`
 * it is a dry run. The file stays outside the repository, and the command never prints a private value.
 *
 * Usage: node backend/scripts/import-businesses.ts <dev|prod> <file> [--apply]
 */

const ENVIRONMENTS = ['dev', 'prod'];
const USAGE = 'Usage: node backend/scripts/import-businesses.ts <dev|prod> <file> [--apply]';

export interface ImportDependencies {
  readStackSettings(stackName: string): Promise<StackSettings>;
  createDatabase(settings: StackSettings): DataApi;
  /** The file's bytes. Throws when it cannot be read. */
  readFile(path: string): Uint8Array;
  /** Asks a question in the terminal and returns the answer. */
  askConfirmation(question: string): Promise<string>;
  log(line: string): void;
  logError(line: string): void;
}

/** The plan as printed: counts, and the names of every group but the unchanged one (scenario "Dry run"). */
function planLines(environment: string, plan: ImportPlan): string[] {
  const group = (title: string, names: string[], listNames = true) => [
    `  ${title}: ${names.length}`,
    ...(listNames ? names.map((name) => `    ${name}`) : []),
  ];
  return [
    `Plan for ${environment}:`,
    ...group('Added', plan.added.map((write) => write.business.name)),
    ...group('Changed', plan.changed.map((write) => write.business.name)),
    ...group('Reactivated', plan.reactivated.map((write) => write.business.name)),
    ...group('Deactivated', plan.deactivated.map((entry) => entry.name)),
    ...group('Unchanged', plan.unchanged.map((business) => business.name), false),
    ...group('Edited hours kept', plan.editedHours.map((entry) => entry.name)),
  ];
}

/** Runs the command and returns the process exit code. */
export async function importBusinesses(args: string[], dependencies: ImportDependencies): Promise<number> {
  const paths = args.filter((arg) => !arg.startsWith('--'));
  const options = args.filter((arg) => arg.startsWith('--'));
  const [environment, path] = paths;

  // Wrong arguments read nothing, in any environment (scenario "Wrong arguments").
  if (environment === undefined || path === undefined || paths.length > 2) {
    dependencies.logError(USAGE);
    return 1;
  }
  if (!ENVIRONMENTS.includes(environment)) {
    dependencies.logError(`Unknown environment "${environment}". ${USAGE}`);
    return 1;
  }
  const unknownOption = options.find((option) => option !== '--apply');
  if (unknownOption !== undefined) {
    dependencies.logError(`Unknown option "${unknownOption}". ${USAGE}`);
    return 1;
  }
  const apply = options.includes('--apply');

  let bytes: Uint8Array;
  try {
    bytes = dependencies.readFile(path);
  } catch (error) {
    dependencies.logError(`Cannot read ${path}: ${describeError(error)}`);
    return 1;
  }

  // The whole file is checked before any environment is read (requirement "All or nothing").
  const fileSha256 = createHash('sha256').update(bytes).digest('hex');
  const check = checkHandoffFile(new TextDecoder().decode(bytes));
  if (!check.valid) {
    check.problems.forEach((problem) => dependencies.logError(formatHandoffProblem(problem)));
    const count = check.problems.length;
    dependencies.logError(`Refused: ${count} ${count === 1 ? 'problem' : 'problems'}. Nothing was written.`);
    return 1;
  }
  const { file } = check;

  let database: DataApi;
  let plan: ImportPlan;
  let matchesDev = false;
  try {
    database = dependencies.createDatabase(await dependencies.readStackSettings(`alameda-${environment}`));
    plan = planImport(await findImportedBusinesses(database.execute), file);

    dependencies.log(
      `Checked ${path}: ${file.businesses.length} businesses, generated ${file.generatedAt}, SHA-256 ${fileSha256}`,
    );
    planLines(environment, plan).forEach((line) => dependencies.log(line));

    if (environment === 'prod') {
      const dev = dependencies.createDatabase(await dependencies.readStackSettings('alameda-dev'));
      const lastDevImport = await findLastImport(dev.execute);
      matchesDev = lastDevImport?.fileSha256 === fileSha256;
      dependencies.log(
        matchesDev
          ? 'The file matches the last import applied to dev.'
          : lastDevImport === null
            ? 'dev has no import yet, so --apply will refuse this file.'
            : 'The file does not match the last import applied to dev, so --apply will refuse it.',
      );
      // The file goes to prod, not the dev rows, so hours edited in dev must be repeated by hand (design, "Risks").
      const editedInDev = planImport(await findImportedBusinesses(dev.execute), file).editedHours;
      dependencies.log(`Hours edited in dev, to repeat in prod admin mode: ${editedInDev.length}`);
      editedInDev.forEach((entry) => dependencies.log(`    ${entry.name}`));
    }
  } catch (error) {
    // Reading never quotes a stored value: the repository's errors name the column only.
    dependencies.logError(describeError(error));
    return 1;
  }

  if (!apply) {
    dependencies.log('Dry run: nothing was written. Run again with --apply to write this plan.');
    return 0;
  }

  // Both checks happen before the transaction begins, so its 3-minute idle limit is never reached (design D-5).
  if (environment === 'prod') {
    if (!matchesDev) {
      dependencies.logError(
        'Refused: prod accepts only the file last applied to dev. Import this file into dev and review it first.',
      );
      return 1;
    }
    const answer = await dependencies.askConfirmation("Applying this plan to prod. Type 'prod' to continue: ");
    if (answer.trim() !== 'prod') {
      dependencies.log('Stopped. prod was not changed.');
      return 1;
    }
  }

  try {
    await database.inTransaction(async (execute) => {
      for (const write of [...plan.added, ...plan.changed, ...plan.reactivated]) {
        await upsertImportedBusiness(execute, write.business, { writeHours: write.writeHours });
      }
      for (const entry of plan.deactivated) {
        await deactivateImportedBusiness(execute, entry.googlePlaceId);
      }
      await recordImport(execute, { fileSha256, generatedAt: file.generatedAt, counts: countPlan(plan) });
    });
  } catch (error) {
    // A database error can quote the failing row, private values included, so only its name is printed.
    const name = error instanceof Error ? error.name : 'unknown error';
    dependencies.logError(`The import failed and was rolled back. Nothing was written. (${name})`);
    return 1;
  }

  dependencies.log(`Applied to ${environment}.`);
  return 0;
}

const dependencies: ImportDependencies = {
  readStackSettings: readStackSettingsWithAwsCli,
  createDatabase: (settings) =>
    createDataApi(
      { resourceArn: settings.clusterArn, secretArn: settings.secretArn, database: settings.databaseName },
      new RDSDataClient({ region: REGION }),
    ),
  readFile: (path) => readFileSync(path),
  async askConfirmation(question) {
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    try {
      return await terminal.question(question);
    } finally {
      terminal.close();
    }
  },
  log: (line) => console.log(line),
  logError: (line) => console.error(line),
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await importBusinesses(process.argv.slice(2), dependencies);
}
