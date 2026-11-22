import { normalizeDescription } from '../domain/description.ts';
import { normalizeInstagramUrl } from '../domain/instagramUrl.ts';
import { normalizeMapsUrl } from '../domain/mapsUrl.ts';
import { validateOpeningHoursForWriting, type OpeningHoursRange } from '../domain/openingHours.ts';
import { normalizeWebsiteUrl } from '../domain/websiteUrl.ts';
import { normalizeWhatsappNumber } from '../domain/whatsappNumber.ts';

/**
 * The check of the pipeline's handoff file, before anything is written (business-import spec, "Handoff file",
 * "Consent rules", and "All or nothing"; import-businesses design D-5, D-6, D-9). Pure: it takes the file's text.
 * The validators of the API are used in their strict form: a value they would return as `null` is a problem.
 */

export const SOURCE_TYPES = ['storefront', 'company', 'link', 'owner_published', 'private_group'] as const;
export const CONSENT_CHANNELS = ['whatsapp', 'in_person', 'phone_call', 'email'] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];
export type ConsentChannel = (typeof CONSENT_CHANNELS)[number];

/** Stored with the business and never returned by the API (business-import spec, "Private fields stay private"). */
export interface HandoffPrivateFields {
  googlePlaceId: string;
  latitude: number;
  longitude: number;
  coordinatesSource: string;
  sourceType: SourceType;
  sourceCategory: string | null;
  activityScore: number;
  /** `YYYY-MM-DD`. */
  activityAsOf: string;
  lastVerifiedAt: string | null;
  consentedAt: string | null;
  consentChannel: ConsentChannel | null;
  adminNotes: string | null;
}

/** A business of the file, with every value in the form it is stored in. */
export interface HandoffBusiness {
  name: string;
  category: string;
  locationSummary: string;
  hasPhysicalStore: boolean;
  /** Digits with country code. */
  whatsappNumber: string | null;
  websiteUrl: string | null;
  /** Sorted by day and opening time. */
  openingHours: OpeningHoursRange[];
  mapsUrl: string | null;
  description: string | null;
  instagramUrl: string | null;
  private: HandoffPrivateFields;
}

export interface HandoffFile {
  /** `YYYY-MM-DD`. */
  generatedAt: string;
  businesses: HandoffBusiness[];
}

/**
 * One broken rule. It names the place, never the value, since a value may be private
 * (business-import spec, "All or nothing"). The place id is public: it is part of every Maps link.
 */
export interface HandoffProblem {
  /** 1-based position of the business in the file, or `null` for the file itself. */
  position: number | null;
  placeId: string | null;
  field: string;
  rule: string;
}

export type HandoffCheck = { valid: true; file: HandoffFile } | { valid: false; problems: HandoffProblem[] };

const FILE_FIELDS = ['generatedAt', 'source', 'count', 'businesses'];
const BUSINESS_FIELDS = [
  'name',
  'category',
  'locationSummary',
  'hasPhysicalStore',
  'whatsappNumber',
  'websiteUrl',
  'openingHours',
  'mapsUrl',
  'description',
  'instagramUrl',
  'private',
];
const PRIVATE_FIELDS = [
  'googlePlaceId',
  'latitude',
  'longitude',
  'coordinatesSource',
  'sourceType',
  'sourceCategory',
  'activityScore',
  'activityAsOf',
  'lastVerifiedAt',
  'consentedAt',
  'consentChannel',
  'adminNotes',
];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A real calendar date written as `YYYY-MM-DD`. */
function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE.test(value)) {
    return false;
  }
  // A month 13 gives an invalid date, and 2026-02-30 rolls over to March, so both fail here.
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isNumberBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && (values as readonly string[]).includes(value);
}

/** Collects the problems of one object (the file, a business, or its private fields). */
class ProblemList {
  readonly problems: HandoffProblem[] = [];
  position: number | null = null;
  placeId: string | null = null;

  add(field: string, rule: string): void {
    this.problems.push({ position: this.position, placeId: this.placeId, field, rule });
  }

  /** Reports unknown and missing fields, and returns the fields that are present, so each one is checked once. */
  checkFields(object: JsonObject, expected: string[], prefix = ''): Set<string> {
    for (const key of Object.keys(object)) {
      if (!expected.includes(key)) {
        this.add(`${prefix}${key}`, 'is not a known field');
      }
    }
    const present = new Set<string>();
    for (const key of expected) {
      if (Object.hasOwn(object, key)) {
        present.add(key);
      } else {
        this.add(`${prefix}${key}`, 'is missing');
      }
    }
    return present;
  }
}

/** Runs `read` for a present field, and records `rule` when it returns `undefined`. */
function field<T>(list: ProblemList, present: Set<string>, name: string, rule: string, read: () => T | undefined): T | undefined {
  const key = name.replace(/^private\./, '');
  if (!present.has(key)) {
    return undefined;
  }
  const value = read();
  if (value === undefined) {
    list.add(name, rule);
  }
  return value;
}

/** `null`, or the value `normalize` accepts. Anything it would turn into `null` is invalid. */
function nullableStrict(value: unknown, normalize: (raw: string) => string | null): string | null | undefined {
  if (value === null) {
    return null;
  }
  return typeof value === 'string' ? (normalize(value) ?? undefined) : undefined;
}

function checkPrivateFields(
  list: ProblemList,
  value: JsonObject,
  seenPlaceIds: Set<string>,
): HandoffPrivateFields | undefined {
  const present = list.checkFields(value, PRIVATE_FIELDS, 'private.');
  const text = (name: string) => (isText(value[name]) ? value[name].trim() : undefined);
  const nullableText = (name: string) => (value[name] === null ? null : typeof value[name] === 'string' ? value[name] : undefined);
  const nullableDate = (name: string) => (value[name] === null ? null : isDate(value[name]) ? value[name] : undefined);

  const googlePlaceId = field(list, present, 'private.googlePlaceId', 'must be text that is not empty', () =>
    text('googlePlaceId'),
  );
  if (googlePlaceId !== undefined) {
    if (seenPlaceIds.has(googlePlaceId)) {
      list.add('private.googlePlaceId', 'must be unique in the file');
    }
    seenPlaceIds.add(googlePlaceId);
  }
  const fields = {
    googlePlaceId,
    latitude: field(list, present, 'private.latitude', 'must be a number from -90 to 90', () =>
      isNumberBetween(value.latitude, -90, 90) ? value.latitude : undefined,
    ),
    longitude: field(list, present, 'private.longitude', 'must be a number from -180 to 180', () =>
      isNumberBetween(value.longitude, -180, 180) ? value.longitude : undefined,
    ),
    coordinatesSource: field(list, present, 'private.coordinatesSource', 'must be text that is not empty', () =>
      text('coordinatesSource'),
    ),
    sourceType: field(list, present, 'private.sourceType', `must be one of ${SOURCE_TYPES.join(', ')}`, () =>
      isOneOf(SOURCE_TYPES, value.sourceType) ? value.sourceType : undefined,
    ),
    sourceCategory: field(list, present, 'private.sourceCategory', 'must be null or text', () =>
      nullableText('sourceCategory'),
    ),
    activityScore: field(list, present, 'private.activityScore', 'must be a whole number from 0 to 100', () =>
      Number.isInteger(value.activityScore) && isNumberBetween(value.activityScore, 0, 100) ? value.activityScore : undefined,
    ),
    activityAsOf: field(list, present, 'private.activityAsOf', 'must be a date YYYY-MM-DD', () =>
      isDate(value.activityAsOf) ? value.activityAsOf : undefined,
    ),
    lastVerifiedAt: field(list, present, 'private.lastVerifiedAt', 'must be null or a date YYYY-MM-DD', () =>
      nullableDate('lastVerifiedAt'),
    ),
    consentedAt: field(list, present, 'private.consentedAt', 'must be null or a date YYYY-MM-DD', () =>
      nullableDate('consentedAt'),
    ),
    consentChannel: field(
      list,
      present,
      'private.consentChannel',
      `must be null or one of ${CONSENT_CHANNELS.join(', ')}`,
      () => (value.consentChannel === null ? null : isOneOf(CONSENT_CHANNELS, value.consentChannel) ? value.consentChannel : undefined),
    ),
    adminNotes: field(list, present, 'private.adminNotes', 'must be null or text', () => nullableText('adminNotes')),
  };
  return Object.values(fields).every((entry) => entry !== undefined) ? (fields as HandoffPrivateFields) : undefined;
}

function checkBusiness(list: ProblemList, value: unknown, seenPlaceIds: Set<string>): HandoffBusiness | undefined {
  if (!isObject(value)) {
    list.add('business', 'must be an object');
    return undefined;
  }
  const privateValue = value.private;
  if (isObject(privateValue) && isText(privateValue.googlePlaceId)) {
    list.placeId = privateValue.googlePlaceId.trim();
  }

  const present = list.checkFields(value, BUSINESS_FIELDS);
  const text = (name: string) => (isText(value[name]) ? value[name].trim() : undefined);

  const business = {
    name: field(list, present, 'name', 'must be text that is not empty', () => text('name')),
    category: field(list, present, 'category', 'must be text that is not empty', () => text('category')),
    locationSummary: field(list, present, 'locationSummary', 'must be text that is not empty', () => text('locationSummary')),
    hasPhysicalStore: field(list, present, 'hasPhysicalStore', 'must be true or false', () =>
      typeof value.hasPhysicalStore === 'boolean' ? value.hasPhysicalStore : undefined,
    ),
    whatsappNumber: field(list, present, 'whatsappNumber', 'must be null or a valid WhatsApp number', () =>
      nullableStrict(value.whatsappNumber, normalizeWhatsappNumber),
    ),
    websiteUrl: field(list, present, 'websiteUrl', 'must be null or a valid https website', () =>
      nullableStrict(value.websiteUrl, normalizeWebsiteUrl),
    ),
    // The validator's own messages quote the times, so only the rule is reported.
    openingHours: field(list, present, 'openingHours', 'must be a valid week (business-editing spec, "Opening hours for writing")', () => {
      const validation = validateOpeningHoursForWriting(value.openingHours);
      return validation.valid ? validation.ranges : undefined;
    }),
    mapsUrl: field(list, present, 'mapsUrl', 'must be null or a valid Google Maps link', () =>
      nullableStrict(value.mapsUrl, normalizeMapsUrl),
    ),
    description: field(list, present, 'description', 'must be null or text of 1 to 300 characters', () =>
      nullableStrict(value.description, normalizeDescription),
    ),
    instagramUrl: field(list, present, 'instagramUrl', 'must be null or a valid Instagram profile link', () =>
      nullableStrict(value.instagramUrl, normalizeInstagramUrl),
    ),
    private: field(list, present, 'private', 'must be an object', () => (isObject(privateValue) ? privateValue : undefined)),
  };

  const privateFields = business.private === undefined ? undefined : checkPrivateFields(list, business.private, seenPlaceIds);

  // Consent rules: a number seen on Google Maps or in a photo is not consent.
  if (privateFields !== undefined) {
    const consented = privateFields.consentedAt !== null && privateFields.consentChannel !== null;
    if (business.whatsappNumber !== undefined && business.whatsappNumber !== null && !consented) {
      list.add('whatsappNumber', 'needs private.consentedAt and private.consentChannel (consent rules)');
    }
    if (privateFields.sourceType === 'private_group' && !consented) {
      list.add('private.sourceType', 'private_group needs private.consentedAt and private.consentChannel (consent rules)');
    }
  }

  const complete = Object.values(business).every((entry) => entry !== undefined) && privateFields !== undefined;
  return complete ? ({ ...business, private: privateFields } as HandoffBusiness) : undefined;
}

/** Checks the whole file. Every problem is listed, so one run shows everything the pipeline must fix. */
export function checkHandoffFile(text: string): HandoffCheck {
  const fileProblems = new ProblemList();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { valid: false, problems: [{ position: null, placeId: null, field: 'file', rule: 'must be valid JSON' }] };
  }
  if (!isObject(parsed)) {
    return { valid: false, problems: [{ position: null, placeId: null, field: 'file', rule: 'must be a JSON object' }] };
  }

  const present = fileProblems.checkFields(parsed, FILE_FIELDS);
  const generatedAt = field(fileProblems, present, 'generatedAt', 'must be a date YYYY-MM-DD', () =>
    isDate(parsed.generatedAt) ? parsed.generatedAt : undefined,
  );
  field(fileProblems, present, 'source', 'must be google_maps', () => (parsed.source === 'google_maps' ? true : undefined));
  const entries = field(fileProblems, present, 'businesses', 'must be a list', () =>
    Array.isArray(parsed.businesses) ? (parsed.businesses as unknown[]) : undefined,
  );
  if (entries !== undefined) {
    field(fileProblems, present, 'count', 'must equal the number of businesses', () =>
      parsed.count === entries.length ? true : undefined,
    );
  }

  const problems = [...fileProblems.problems];
  const businesses: HandoffBusiness[] = [];
  const seenPlaceIds = new Set<string>();
  (entries ?? []).forEach((entry, index) => {
    const list = new ProblemList();
    list.position = index + 1;
    const business = checkBusiness(list, entry, seenPlaceIds);
    problems.push(...list.problems);
    if (business !== undefined) {
      businesses.push(business);
    }
  });

  if (problems.length > 0 || generatedAt === undefined || entries === undefined) {
    return { valid: false, problems };
  }
  return { valid: true, file: { generatedAt, businesses } };
}

/** One line per problem, for the command's output. */
export function formatHandoffProblem(problem: HandoffProblem): string {
  const place =
    problem.position === null
      ? 'File'
      : `Business ${problem.position}${problem.placeId === null ? '' : ` (place id ${problem.placeId})`}`;
  return `${place}, ${problem.field}: ${problem.rule}`;
}
