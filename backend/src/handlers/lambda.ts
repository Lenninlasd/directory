import serverless from 'serverless-http';
import { createApp } from '../app.ts';
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
