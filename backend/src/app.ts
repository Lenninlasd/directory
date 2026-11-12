import express, { type ErrorRequestHandler, type Express } from 'express';
import { requireAdminKey, type ReadAdminKey } from './auth/adminKey.ts';
import type { Business } from './domain/business.ts';
import { logEditingRequest, readJsonBody, type LogEditingRequest } from './http/editingRequest.ts';
import {
  interpretOpeningHoursHandler,
  saveOpeningHoursHandler,
  type InterpretBusinessOpeningHours,
  type SaveBusinessOpeningHours,
} from './http/openingHoursHandlers.ts';

export interface EditingDependencies {
  readAdminKey: ReadAdminKey;
  interpretBusinessOpeningHours: InterpretBusinessOpeningHours;
  saveBusinessOpeningHours: SaveBusinessOpeningHours;
  logRequest: LogEditingRequest;
}

export interface AppDependencies {
  listBusinesses: () => Promise<Business[]>;
  /** Receives the failure for the logs. It never receives request data. */
  logError: (error: unknown) => void;
  /** The business-editing routes. Optional until the Lambda handler wires their clients (tasks.md 2.7). */
  editing?: EditingDependencies;
}

/**
 * Express app for the directory API. Each route only parses the request, calls a service, and responds.
 * An editing route runs, in this order: its log line, the admin key check, the JSON body, and its handler
 * (design D-7, D-12).
 */
export function createApp({ listBusinesses, logError, editing }: AppDependencies): Express {
  const app = express();

  app.get('/businesses', async (_request, response) => {
    const businesses = await listBusinesses();
    response.json({ businesses });
  });

  if (editing !== undefined) {
    const checkAdminKey = requireAdminKey(editing.readAdminKey);

    app.post(
      '/businesses/:id/opening-hours/interpretation',
      logEditingRequest('POST /businesses/{id}/opening-hours/interpretation', editing.logRequest),
      checkAdminKey,
      readJsonBody('invalid_request'),
      interpretOpeningHoursHandler(editing.interpretBusinessOpeningHours, logError),
    );

    app.put(
      '/businesses/:id/opening-hours',
      logEditingRequest('PUT /businesses/{id}/opening-hours', editing.logRequest),
      checkAdminKey,
      readJsonBody('invalid_opening_hours'),
      saveOpeningHoursHandler(editing.saveBusinessOpeningHours),
    );
  }

  // Express 5 forwards errors from async handlers here. The body never includes error details (spec 001 AC-6.4).
  const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    logError(error);
    response.status(500).json({ error: 'internal_error' });
  };
  app.use(handleError);

  return app;
}
