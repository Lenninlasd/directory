import type { RequestHandler } from 'express';
import { InterpretationUnavailable } from '../interpretation/openingHoursInterpretation.ts';
import type {
  InterpretBusinessOpeningHoursOutcome,
  SaveBusinessOpeningHoursOutcome,
} from '../services/openingHoursService.ts';
import { bodyField, sendEditingResponse } from './editingRequest.ts';

export type InterpretBusinessOpeningHours = (input: {
  id: string;
  request: unknown;
}) => Promise<InterpretBusinessOpeningHoursOutcome>;

export type SaveBusinessOpeningHours = (input: {
  id: string;
  openingHours: unknown;
}) => Promise<SaveBusinessOpeningHoursOutcome>;

/**
 * Handler of `POST /businesses/{id}/opening-hours/interpretation` (business-editing spec, "Opening hours
 * interpretation"). It only maps the service's outcome to a response and a log line.
 */
export function interpretOpeningHoursHandler(
  interpretBusinessOpeningHours: InterpretBusinessOpeningHours,
  logError: (error: unknown) => void,
): RequestHandler<{ id: string }> {
  return async (request, response) => {
    let outcome: InterpretBusinessOpeningHoursOutcome;
    try {
      outcome = await interpretBusinessOpeningHours({
        id: request.params.id,
        request: bodyField(request.body, 'request'),
      });
    } catch (error) {
      if (!(error instanceof InterpretationUnavailable)) {
        throw error;
      }
      // The admin sees the same message for a timeout and for a wrong API key; only the cause tells them apart.
      logError(error);
      sendEditingResponse(response, 503, { error: 'interpretation_unavailable' }, { outcome: 'unavailable' });
      return;
    }

    if (outcome.status === 'invalid_request') {
      sendEditingResponse(response, 400, { error: 'invalid_request' }, { outcome: 'invalid' });
      return;
    }
    if (outcome.status === 'not_found') {
      sendEditingResponse(response, 404, { error: 'not_found' }, { outcome: 'not_found' });
      return;
    }
    const { interpretation, stopReason, usage, promptVersion } = outcome.result;
    sendEditingResponse(response, 200, interpretation, {
      outcome: interpretation.understood ? 'understood' : 'not_understood',
      promptVersion,
      stopReason,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  };
}

/** Handler of `PUT /businesses/{id}/opening-hours` (business-editing spec, "Opening hours update"). */
export function saveOpeningHoursHandler(
  saveBusinessOpeningHours: SaveBusinessOpeningHours,
): RequestHandler<{ id: string }> {
  return async (request, response) => {
    const outcome = await saveBusinessOpeningHours({
      id: request.params.id,
      openingHours: bodyField(request.body, 'openingHours'),
    });

    if (outcome.status === 'not_found') {
      sendEditingResponse(response, 404, { error: 'not_found' }, { outcome: 'not_found' });
      return;
    }
    if (outcome.status === 'invalid_opening_hours') {
      sendEditingResponse(response, 400, { error: 'invalid_opening_hours' }, { outcome: 'invalid' });
      return;
    }
    sendEditingResponse(response, 200, { openingHours: outcome.openingHours }, { outcome: 'saved' });
  };
}
