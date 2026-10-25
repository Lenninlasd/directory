import { RDSDataClient } from '@aws-sdk/client-rds-data';
import serverless from 'serverless-http';
import { createApp } from '../app.ts';
import { createDataApi, readDataApiConfig } from '../db/dataApi.ts';
import { findActiveBusinessRows } from '../repositories/businessRepository.ts';
import { listActiveBusinesses, type FindActiveBusinessRows } from '../services/businessService.ts';

export interface HandlerDependencies {
  findRows: FindActiveBusinessRows;
  logError: (error: unknown) => void;
}

/** Lambda entry for API Gateway HTTP API events. It contains no business rules. */
export function createHandler({ findRows, logError }: HandlerDependencies) {
  const app = createApp({
    listBusinesses: () => listActiveBusinesses(findRows),
    logError,
  });
  return serverless(app);
}

/**
 * Reads the configuration and creates the Data API client on every request, so no state is kept
 * between invocations (AGENTS.md) and configuration errors reach the error handler as `internal_error`.
 */
async function findRowsThroughDataApi() {
  const dataApi = createDataApi(readDataApiConfig(process.env), new RDSDataClient({}));
  return findActiveBusinessRows(dataApi.execute);
}

export const handler = createHandler({
  findRows: findRowsThroughDataApi,
  logError: (error) => console.error('GET /businesses failed', error),
});
