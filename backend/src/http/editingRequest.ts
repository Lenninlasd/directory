import { performance } from 'node:perf_hooks';
import express, { type RequestHandler, type Response } from 'express';

/** What happened to an editing request, for its log line (design D-12). */
export type EditingOutcome =
  | 'saved'
  | 'understood'
  | 'not_understood'
  | 'unauthorized'
  | 'not_found'
  | 'invalid'
  | 'unavailable'
  | 'error';

/** One log line per editing request. It never holds headers, keys, or the request text (design D-12). */
export interface EditingRequestLog {
  route: string;
  outcome: EditingOutcome;
  latencyMs: number;
  promptVersion?: string;
  stopReason?: string | null;
  inputTokens?: number;
  outputTokens?: number;
}

/** What a handler knows about its request. The route and the latency are added when the line is written. */
export type EditingLogDetails = Omit<EditingRequestLog, 'route' | 'latencyMs'>;

export type LogEditingRequest = (entry: EditingRequestLog) => void;

/** The outcome when no handler set one: the admin key middleware and the error handler answer by themselves. */
function outcomeFromStatus(status: number): EditingOutcome {
  if (status === 401) {
    return 'unauthorized';
  }
  return status >= 500 ? 'error' : 'invalid';
}

/**
 * First middleware of an editing route: writes one log line when the response is sent, whoever sent it.
 * `route` is the route template, such as `PUT /businesses/{id}/opening-hours`, so the line never holds
 * the path, the headers, or the body.
 */
export function logEditingRequest(route: string, logRequest: LogEditingRequest): RequestHandler {
  return (_request, response, next) => {
    const started = performance.now();
    response.on('finish', () => {
      const details = (response.locals.editingLog as EditingLogDetails | undefined) ?? {
        outcome: outcomeFromStatus(response.statusCode),
      };
      logRequest({ route, ...details, latencyMs: Math.round(performance.now() - started) });
    });
    next();
  };
}

/** Sends the JSON response of an editing route and records what its log line says. */
export function sendEditingResponse(
  response: Response,
  status: number,
  body: object,
  logDetails: EditingLogDetails,
): void {
  response.locals.editingLog = logDetails;
  response.status(status).json(body);
}

/**
 * Reads a JSON body of at most 4 KB (design D-7). A body that is not JSON or is over the limit gets
 * `400` with the route's own error code. Place it after the admin key check, so the body of an
 * unauthorized request is never read.
 */
export function readJsonBody(invalidBodyError: string): RequestHandler {
  const parseJson = express.json({ limit: '4kb' });
  return (request, response, next) => {
    parseJson(request, response, (error?: unknown) => {
      const type = (error as { type?: unknown } | null | undefined)?.type;
      if (type === 'entity.parse.failed' || type === 'entity.too.large') {
        sendEditingResponse(response, 400, { error: invalidBodyError }, { outcome: 'invalid' });
        return;
      }
      next(error);
    });
  };
}

/** A field of a JSON object body. Any other body (none, a list, or raw bytes of another content type) has none. */
export function bodyField(body: unknown, name: string): unknown {
  const isObject = typeof body === 'object' && body !== null && !Array.isArray(body) && !Buffer.isBuffer(body);
  return isObject ? (body as Record<string, unknown>)[name] : undefined;
}
