import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data';

export interface DataApiConfig {
  resourceArn: string;
  secretArn: string;
  database: string;
}

/** The part of `RDSDataClient` this module uses, so tests can pass a fake. */
export interface DataApiClient {
  send(
    command: ExecuteStatementCommand | BeginTransactionCommand | CommitTransactionCommand | RollbackTransactionCommand,
  ): Promise<{ formattedRecords?: string; transactionId?: string }>;
}

export type Execute = (sql: string, parameters?: Record<string, string>) => Promise<Record<string, unknown>[]>;

export interface DataApi {
  execute: Execute;
  /** Runs `work` in one transaction: commits if it resolves, rolls back and rethrows if it fails. */
  inTransaction<T>(work: (execute: Execute) => Promise<T>): Promise<T>;
}

function requireVariable(environment: Record<string, string | undefined>, name: string): string {
  const value = environment[name];
  if (value === undefined || value === '') {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export function readDataApiConfig(environment: Record<string, string | undefined>): DataApiConfig {
  return {
    resourceArn: requireVariable(environment, 'DATA_API_CLUSTER_ARN'),
    secretArn: requireVariable(environment, 'DATA_API_SECRET_ARN'),
    database: requireVariable(environment, 'DATABASE_NAME'),
  };
}

export function createDataApi(config: DataApiConfig, client: DataApiClient): DataApi {
  const target = { resourceArn: config.resourceArn, secretArn: config.secretArn };

  async function execute(sql: string, parameters: Record<string, string> = {}, transactionId?: string) {
    const { formattedRecords } = await client.send(
      new ExecuteStatementCommand({
        ...target,
        database: config.database,
        sql,
        formatRecordsAs: 'JSON',
        parameters: Object.entries(parameters).map(([name, value]) => ({ name, value: { stringValue: value } })),
        transactionId,
      }),
    );
    // Callers validate each field they read (for example the business repository).
    const records: Record<string, unknown>[] = formattedRecords ? JSON.parse(formattedRecords) : [];
    return records;
  }

  async function inTransaction<T>(work: (execute: Execute) => Promise<T>): Promise<T> {
    const { transactionId } = await client.send(new BeginTransactionCommand({ ...target, database: config.database }));
    if (!transactionId) {
      throw new Error('The Data API did not return a transaction id');
    }
    try {
      const result = await work((sql, parameters) => execute(sql, parameters, transactionId));
      await client.send(new CommitTransactionCommand({ ...target, transactionId }));
      return result;
    } catch (error) {
      await client.send(new RollbackTransactionCommand({ ...target, transactionId }));
      throw error;
    }
  }

  return { execute: (sql, parameters) => execute(sql, parameters), inTransaction };
}
