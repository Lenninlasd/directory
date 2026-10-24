import express, { type ErrorRequestHandler, type Express } from 'express';
import type { Business } from './domain/business.ts';

export interface AppDependencies {
  listBusinesses: () => Promise<Business[]>;
  /** Receives the failure for the logs. It never receives request data. */
  logError: (error: unknown) => void;
}

/** Express app for the directory API. It only parses the request, calls the service, and responds. */
export function createApp({ listBusinesses, logError }: AppDependencies): Express {
  const app = express();

  app.get('/businesses', async (_request, response) => {
    const businesses = await listBusinesses();
    response.json({ businesses });
  });

  // Express 5 forwards errors from async handlers here. The body never includes error details (spec 001 AC-6.4).
  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    logError(error);
    response.status(500).json({ error: 'internal_error' });
  };
  app.use(handleError);

  return app;
}
