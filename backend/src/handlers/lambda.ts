import Anthropic from '@anthropic-ai/sdk';
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import serverless from 'serverless-http';
import { createApp, type EditingDependencies } from '../app.ts';
import { createDataApi, readDataApiConfig, requireVariable, type Execute } from '../db/dataApi.ts';
import type { CallModel } from '../interpretation/openingHoursInterpretation.ts';
import {
  findActiveBusinessOpeningHours,
  findActiveBusinessRows,
  updateActiveBusinessOpeningHours,
} from '../repositories/businessRepository.ts';
import { listActiveBusinesses, type FindActiveBusinessRows } from '../services/businessService.ts';
import { interpretBusinessOpeningHours, saveBusinessOpeningHours } from '../services/openingHoursService.ts';

export interface HandlerDependencies {
  findRows: FindActiveBusinessRows;
  logError: (error: unknown) => void;
  editing: EditingDependencies;
}

/** Lambda entry for API Gateway HTTP API events. It contains no business rules. */
export function createHandler({ findRows, logError, editing }: HandlerDependencies) {
  const app = createApp({
    listBusinesses: () => listActiveBusinesses(findRows),
    logError,
    editing,
  });
  return serverless(app);
}

/** The part of `SSMClient` this module uses, so tests can pass a fake. */
export interface ParameterClient {
  send(command: GetParameterCommand): Promise<{ Parameter?: { Value?: string } }>;
}

/**
 * Reads the `SecureString` parameter whose name is in the environment variable `variableName`,
 * decrypted (design D-8). It is called on each request that needs it, so nothing is cached and a
 * rotated key is used by the next request. Errors name the parameter, never its value.
 */
export async function readSecureParameter(
  client: ParameterClient,
  environment: Record<string, string | undefined>,
  variableName: string,
): Promise<string> {
  const name = requireVariable(environment, variableName);
  const { Parameter } = await client.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  if (Parameter?.Value === undefined) {
    throw new Error(`Parameter ${name} has no value`);
  }
  return Parameter.Value;
}

/**
 * The Anthropic client for one request (design D-11): a 7-second timeout and no retries, so a slow
 * model gives a clean `503` before the 10-second Lambda timeout.
 */
export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, timeout: 7000, maxRetries: 0 });
}

/**
 * Reads the configuration and creates each client on every request, so no state is kept between
 * invocations (AGENTS.md) and configuration errors reach the error handler as `internal_error`.
 */
const executeThroughDataApi: Execute = (sql, parameters) =>
  createDataApi(readDataApiConfig(process.env), new RDSDataClient({})).execute(sql, parameters);

async function findRowsThroughDataApi() {
  return findActiveBusinessRows(executeThroughDataApi);
}

function readParameter(variableName: string): Promise<string> {
  return readSecureParameter(new SSMClient({}), process.env, variableName);
}

function createCallModel(apiKey: string): CallModel {
  const client = createAnthropicClient(apiKey);
  return (params) => client.messages.create(params);
}

export const handler = createHandler({
  findRows: findRowsThroughDataApi,
  // Each failure with its cause, for CloudWatch. It never receives headers, keys, or request text.
  logError: (error) => console.error('Request failed', error),
  editing: {
    readAdminKey: () => readParameter('ADMIN_KEY_PARAMETER'),
    interpretBusinessOpeningHours: (input) =>
      interpretBusinessOpeningHours(input, {
        findOpeningHours: (id) => findActiveBusinessOpeningHours(executeThroughDataApi, id),
        readAnthropicApiKey: () => readParameter('ANTHROPIC_API_KEY_PARAMETER'),
        createCallModel,
      }),
    saveBusinessOpeningHours: (input) =>
      saveBusinessOpeningHours(input, {
        updateOpeningHours: (id, openingHoursJson) =>
          updateActiveBusinessOpeningHours(executeThroughDataApi, id, openingHoursJson),
      }),
    // One JSON line per editing request, for CloudWatch Logs Insights (design D-12).
    logRequest: (entry) => console.log(JSON.stringify(entry)),
  },
});
