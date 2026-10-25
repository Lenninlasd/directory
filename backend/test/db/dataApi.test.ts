import {
  BeginTransactionCommand,
  CommitTransactionCommand,
  ExecuteStatementCommand,
  RollbackTransactionCommand,
} from '@aws-sdk/client-rds-data';
import { describe, expect, it, vi } from 'vitest';
import { createDataApi, readDataApiConfig, type DataApiClient, type DataApiConfig } from '../../src/db/dataApi.ts';

const config: DataApiConfig = {
  resourceArn: 'arn:aws:rds:us-east-1:000000000000:cluster:alameda-dev',
  secretArn: 'arn:aws:secretsmanager:us-east-1:000000000000:secret:alameda-dev',
  database: 'directory',
};

/** Fake SDK client: answers each command with the next queued response, or throws a queued error. */
function fakeClient(responses: Array<{ formattedRecords?: string; transactionId?: string } | Error>) {
  const commands: unknown[] = [];
  const client: DataApiClient = {
    send: vi.fn(async (command) => {
      commands.push(command);
      const next = responses.shift() ?? {};
      if (next instanceof Error) {
        throw next;
      }
      return next;
    }),
  };
  return { client, commands };
}

describe('readDataApiConfig', () => {
  const environment = {
    DATA_API_CLUSTER_ARN: config.resourceArn,
    DATA_API_SECRET_ARN: config.secretArn,
    DATABASE_NAME: config.database,
  };

  it('reads the configuration from environment variables', () => {
    expect(readDataApiConfig(environment)).toEqual(config);
  });

  it('fails with a clear message when a variable is missing', () => {
    expect(() => readDataApiConfig({ ...environment, DATA_API_SECRET_ARN: undefined })).toThrow(
      'Missing environment variable DATA_API_SECRET_ARN',
    );
  });
});

describe('createDataApi execute', () => {
  it('sends the configured cluster, secret, database, SQL, and JSON format', async () => {
    const { client, commands } = fakeClient([{ formattedRecords: '[]' }]);

    await createDataApi(config, client).execute('SELECT 1');

    const command = commands[0];
    expect(command).toBeInstanceOf(ExecuteStatementCommand);
    expect((command as ExecuteStatementCommand).input).toMatchObject({
      resourceArn: config.resourceArn,
      secretArn: config.secretArn,
      database: config.database,
      sql: 'SELECT 1',
      formatRecordsAs: 'JSON',
    });
  });

  it('passes parameters as named string parameters', async () => {
    const { client, commands } = fakeClient([{}]);

    await createDataApi(config, client).execute('INSERT INTO schema_migrations (name) VALUES (:name)', {
      name: '001_create_businesses.sql',
    });

    expect((commands[0] as ExecuteStatementCommand).input.parameters).toEqual([
      { name: 'name', value: { stringValue: '001_create_businesses.sql' } },
    ]);
  });

  it('returns the records parsed from the JSON result', async () => {
    const { client } = fakeClient([{ formattedRecords: '[{"id":"a","is_open":true,"note":null}]' }]);

    expect(await createDataApi(config, client).execute('SELECT ...')).toEqual([{ id: 'a', is_open: true, note: null }]);
  });

  it('returns an empty list for statements without a result set', async () => {
    const { client } = fakeClient([{}]);

    expect(await createDataApi(config, client).execute('CREATE TABLE x (id INT)')).toEqual([]);
  });

  it('does not retry errors, including a paused database that is resuming', async () => {
    const resuming = new Error('The database is resuming');
    resuming.name = 'DatabaseResumingException';
    const { client } = fakeClient([resuming, { formattedRecords: '[]' }]);

    await expect(createDataApi(config, client).execute('SELECT 1')).rejects.toBe(resuming);
    expect(client.send).toHaveBeenCalledTimes(1);
  });
});

describe('createDataApi inTransaction', () => {
  it('begins, runs every statement in the transaction, and commits', async () => {
    const { client, commands } = fakeClient([{ transactionId: 'tx-1' }, {}, {}, {}]);

    const result = await createDataApi(config, client).inTransaction(async (execute) => {
      await execute('CREATE TABLE x (id INT)');
      await execute('INSERT INTO schema_migrations (name) VALUES (:name)', { name: 'x' });
      return 'done';
    });

    expect(result).toBe('done');
    expect(commands[0]).toBeInstanceOf(BeginTransactionCommand);
    expect((commands[0] as BeginTransactionCommand).input).toEqual({
      resourceArn: config.resourceArn,
      secretArn: config.secretArn,
      database: config.database,
    });
    expect((commands[1] as ExecuteStatementCommand).input.transactionId).toBe('tx-1');
    expect((commands[2] as ExecuteStatementCommand).input.transactionId).toBe('tx-1');
    expect(commands[3]).toBeInstanceOf(CommitTransactionCommand);
    expect((commands[3] as CommitTransactionCommand).input.transactionId).toBe('tx-1');
  });

  it('rolls back and rethrows the original error when a statement fails', async () => {
    const statementError = new Error('syntax error');
    const { client, commands } = fakeClient([{ transactionId: 'tx-2' }, statementError, {}]);

    await expect(
      createDataApi(config, client).inTransaction(async (execute) => {
        await execute('CREATE TABLE broken (');
      }),
    ).rejects.toBe(statementError);

    expect(commands[2]).toBeInstanceOf(RollbackTransactionCommand);
    expect((commands[2] as RollbackTransactionCommand).input.transactionId).toBe('tx-2');
    expect(commands.some((command) => command instanceof CommitTransactionCommand)).toBe(false);
  });
});
