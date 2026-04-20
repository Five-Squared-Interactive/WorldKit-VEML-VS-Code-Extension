/**
 * Diagnostic code registry for VEML validation.
 * All diagnostic codes live here — never hardcode diagnostic strings elsewhere.
 *
 * Code ranges:
 *   001–099: Parse errors
 *   100–199: Validation errors
 *   200–299: Schema errors
 *   300–399: Project errors (reserved)
 */

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface DiagnosticCode {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly messageTemplate: string;
  readonly suggestionTemplate: string | undefined;
}

// ── Parse Error Codes (001–099) ─────────────────────────────────────

const PARSE_CODES: DiagnosticCode[] = [
  {
    code: 'VEML001',
    severity: 'error',
    messageTemplate: 'Unclosed tag <{element}>',
    suggestionTemplate: 'Add a closing </{element}> tag',
  },
  {
    code: 'VEML002',
    severity: 'error',
    messageTemplate: 'Mismatched closing tag: expected </{expected}>, found </{found}>',
    suggestionTemplate: 'Change </{found}> to </{expected}>',
  },
  {
    code: 'VEML003',
    severity: 'error',
    messageTemplate: 'Malformed attribute in <{element}>',
    suggestionTemplate: 'Check attribute syntax: name="value"',
  },
  {
    code: 'VEML004',
    severity: 'error',
    messageTemplate: 'Unterminated string in <{element}>',
    suggestionTemplate: 'Add a closing quote to the attribute value',
  },
  {
    code: 'VEML005',
    severity: 'error',
    messageTemplate: 'Invalid XML character: {detail}',
    suggestionTemplate: 'Use XML entity references (e.g., &amp; for &)',
  },
  {
    code: 'VEML006',
    severity: 'error',
    messageTemplate: 'Parse error: {detail}',
    suggestionTemplate: undefined,
  },
];

// ── Validation Error Codes (100–199) ────────────────────────────────

const VALIDATION_CODES: DiagnosticCode[] = [
  {
    code: 'VEML100',
    severity: 'error',
    messageTemplate: 'Missing required attribute "{attribute}" on <{element}>',
    suggestionTemplate: 'Add {attribute}="..." to the <{element}> element',
  },
  {
    code: 'VEML101',
    severity: 'warning',
    messageTemplate: 'Invalid attribute value "{value}" for "{attribute}" on <{element}>',
    suggestionTemplate: 'Check the expected format for "{attribute}"',
  },
  {
    code: 'VEML102',
    severity: 'error',
    messageTemplate: 'Duplicate id "{value}" — entity IDs must be unique',
    suggestionTemplate: 'Rename one of the entities with id="{value}" to a unique identifier',
  },
];

// ── Schema Error Codes (200–299) ────────────────────────────────────

const SCHEMA_CODES: DiagnosticCode[] = [
  {
    code: 'VEML200',
    severity: 'warning',
    messageTemplate: 'Unknown element <{element}>',
    suggestionTemplate: 'Valid elements: world, environment, sky, terrain, entities, entity, transform, mesh, material, physics, collider, script, animation, behavior, light, audio, camera, canvas, panel, button, text, input',
  },
  {
    code: 'VEML201',
    severity: 'warning',
    messageTemplate: '<{element}> is not allowed as a child of <{parent}>',
    suggestionTemplate: 'Check the VEML schema for valid child elements of <{parent}>',
  },
  {
    code: 'VEML202',
    severity: 'warning',
    messageTemplate: '<{element}> is not allowed in this context',
    suggestionTemplate: 'Check the VEML schema for where <{element}> can be used',
  },
  {
    code: 'VEML203',
    severity: 'error',
    messageTemplate: 'Entity reference "{value}" does not resolve to any defined entity',
    suggestionTemplate: 'Define an entity with id="{value}" or check the reference for typos',
  },
];

// ── Registry ────────────────────────────────────────────────────────

export const ALL_DIAGNOSTIC_CODES: readonly DiagnosticCode[] = [
  ...PARSE_CODES,
  ...VALIDATION_CODES,
  ...SCHEMA_CODES,
];

const codeMap = new Map<string, DiagnosticCode>(
  ALL_DIAGNOSTIC_CODES.map((dc) => [dc.code, dc]),
);

/**
 * Look up a diagnostic code by its identifier (e.g., "VEML001").
 * Returns undefined if the code is not registered.
 */
export function getDiagnosticCode(code: string): DiagnosticCode | undefined {
  return codeMap.get(code);
}
