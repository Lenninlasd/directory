import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { isAdminKey, requireAdminKey } from '../../src/auth/adminKey.ts';

const KEY = 'Zx8sQ2v1kq3HcR0mN7yLb4pT6wE9uA5d';

// Business-editing spec, "Admin key": only `Bearer {key}` with this environment's key passes (design D-7).
describe('isAdminKey', () => {
  it('accepts the correct key with the Bearer scheme', () => {
    expect(isAdminKey(`Bearer ${KEY}`, KEY)).toBe(true);
  });

  it('accepts the scheme in any letter case, as HTTP allows', () => {
    expect(isAdminKey(`bearer ${KEY}`, KEY)).toBe(true);
  });

  it('rejects a missing header', () => {
    expect(isAdminKey(undefined, KEY)).toBe(false);
  });

  it('rejects a wrong key of the same length', () => {
    const wrong = `${KEY.slice(0, -1)}X`;
    expect(isAdminKey(`Bearer ${wrong}`, KEY)).toBe(false);
  });

  it('rejects a key of a different length', () => {
    expect(isAdminKey(`Bearer ${KEY}extra`, KEY)).toBe(false);
    expect(isAdminKey(`Bearer ${KEY.slice(0, 4)}`, KEY)).toBe(false);
  });

  it('rejects another scheme with the right key', () => {
    expect(isAdminKey(`Basic ${KEY}`, KEY)).toBe(false);
  });

  it('rejects the key without a scheme, and a scheme without a key', () => {
    expect(isAdminKey(KEY, KEY)).toBe(false);
    expect(isAdminKey('Bearer ', KEY)).toBe(false);
    expect(isAdminKey('Bearer', KEY)).toBe(false);
  });

  it('rejects surrounding spaces in the key instead of trimming them', () => {
    expect(isAdminKey(`Bearer  ${KEY}`, KEY)).toBe(false);
    expect(isAdminKey(`Bearer ${KEY} `, KEY)).toBe(false);
  });

  it('rejects everything when the expected key is empty, so a missing secret never opens the routes', () => {
    expect(isAdminKey('Bearer ', '')).toBe(false);
    expect(isAdminKey('Bearer x', '')).toBe(false);
  });
});

function fakeResponse() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

async function run(authorization: string | undefined, readAdminKey: () => Promise<string>) {
  const request = { headers: authorization === undefined ? {} : { authorization } } as Request;
  const response = fakeResponse();
  const next = vi.fn();
  await requireAdminKey(readAdminKey)(request, response as unknown as Response, next as NextFunction);
  return { response, next };
}

describe('requireAdminKey', () => {
  it('calls the next handler for the correct key', async () => {
    const { response, next } = await run(`Bearer ${KEY}`, async () => KEY);

    expect(next).toHaveBeenCalledWith();
    expect(response.status).not.toHaveBeenCalled();
  });

  it('answers 401 with only the error code for a wrong key, without calling the next handler', async () => {
    const { response, next } = await run('Bearer wrong', async () => KEY);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: 'unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('answers 401 without reading the key when there is no Bearer header', async () => {
    const readAdminKey = vi.fn(async () => KEY);
    const missing = await run(undefined, readAdminKey);
    const basic = await run(`Basic ${KEY}`, readAdminKey);

    expect(missing.response.status).toHaveBeenCalledWith(401);
    expect(basic.response.status).toHaveBeenCalledWith(401);
    expect(readAdminKey).not.toHaveBeenCalled();
    expect(missing.next).not.toHaveBeenCalled();
  });

  it('passes a failure to read the key to the error handler, so it becomes internal_error', async () => {
    const failure = new Error('ParameterNotFound');
    const { response, next } = await run(`Bearer ${KEY}`, async () => {
      throw failure;
    });

    expect(next).toHaveBeenCalledWith(failure);
    expect(response.status).not.toHaveBeenCalled();
  });
});
