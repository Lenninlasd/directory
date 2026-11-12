import { createHash, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

/** Reads this environment's admin key, for example from SSM Parameter Store (design D-8). */
export type ReadAdminKey = () => Promise<string>;

// The scheme is case-insensitive in HTTP, the key is taken exactly as sent: no trimming.
const BEARER = /^Bearer (.+)$/i;

function bearerKey(authorizationHeader: string | undefined): string | null {
  const match = authorizationHeader === undefined ? null : BEARER.exec(authorizationHeader);
  return match?.[1] ?? null;
}

function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest();
}

/**
 * True when the header is `Bearer {key}` with exactly the expected key (business-editing spec, "Admin key").
 * Both keys are hashed first, so `timingSafeEqual` always compares two buffers of the same length and the
 * time it takes says nothing about the key (design D-7). An empty expected key never matches.
 */
export function isAdminKey(authorizationHeader: string | undefined, expectedKey: string): boolean {
  const key = bearerKey(authorizationHeader);
  if (key === null || expectedKey === '') {
    return false;
  }
  return timingSafeEqual(digest(key), digest(expectedKey));
}

/**
 * Express middleware for the editing routes. It answers `401` before any other work, and reads the
 * expected key only when the request carries a Bearer key. A failure to read the key goes to the error
 * handler, which answers `internal_error`. The header and the key are never logged.
 */
export function requireAdminKey(readAdminKey: ReadAdminKey): RequestHandler {
  return async (request, response, next) => {
    const header = request.headers.authorization;
    if (bearerKey(header) === null) {
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    let expectedKey: string;
    try {
      expectedKey = await readAdminKey();
    } catch (error) {
      next(error);
      return;
    }

    if (isAdminKey(header, expectedKey)) {
      next();
    } else {
      response.status(401).json({ error: 'unauthorized' });
    }
  };
}
