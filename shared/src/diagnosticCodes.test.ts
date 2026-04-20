import { describe, it, expect } from 'vitest';
import {
  getDiagnosticCode,
  ALL_DIAGNOSTIC_CODES,
} from './diagnosticCodes.js';
// DiagnosticCode type used implicitly via getDiagnosticCode return type

describe('DiagnosticCode Registry', () => {
  it('exports a non-empty array of all diagnostic codes', () => {
    expect(ALL_DIAGNOSTIC_CODES.length).toBeGreaterThan(0);
  });

  it('every code has the format VEMLnnn', () => {
    for (const dc of ALL_DIAGNOSTIC_CODES) {
      expect(dc.code).toMatch(/^VEML\d{3}$/);
    }
  });

  it('every code has a non-empty messageTemplate', () => {
    for (const dc of ALL_DIAGNOSTIC_CODES) {
      expect(dc.messageTemplate.length).toBeGreaterThan(0);
    }
  });

  it('every code has a valid severity', () => {
    const validSeverities = ['error', 'warning', 'info', 'hint'];
    for (const dc of ALL_DIAGNOSTIC_CODES) {
      expect(validSeverities).toContain(dc.severity);
    }
  });

  it('all codes are unique', () => {
    const codes = ALL_DIAGNOSTIC_CODES.map((dc) => dc.code);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('getDiagnosticCode returns a code for a known code', () => {
    const dc = getDiagnosticCode('VEML001');
    expect(dc).toBeDefined();
    expect(dc!.code).toBe('VEML001');
  });

  it('getDiagnosticCode returns undefined for unknown code', () => {
    expect(getDiagnosticCode('VEML999')).toBeUndefined();
  });

  it('has parse error codes in the 001-099 range', () => {
    const parseCodes = ALL_DIAGNOSTIC_CODES.filter((dc) => {
      const num = parseInt(dc.code.slice(4), 10);
      return num >= 1 && num <= 99;
    });
    expect(parseCodes.length).toBeGreaterThan(0);
  });

  it('has validation error codes in the 100-199 range', () => {
    const validationCodes = ALL_DIAGNOSTIC_CODES.filter((dc) => {
      const num = parseInt(dc.code.slice(4), 10);
      return num >= 100 && num <= 199;
    });
    expect(validationCodes.length).toBeGreaterThan(0);
  });

  it('has schema error codes in the 200-299 range', () => {
    const schemaCodes = ALL_DIAGNOSTIC_CODES.filter((dc) => {
      const num = parseInt(dc.code.slice(4), 10);
      return num >= 200 && num <= 299;
    });
    expect(schemaCodes.length).toBeGreaterThan(0);
  });

  it('parse error codes have severity error', () => {
    const parseCodes = ALL_DIAGNOSTIC_CODES.filter((dc) => {
      const num = parseInt(dc.code.slice(4), 10);
      return num >= 1 && num <= 99;
    });
    for (const dc of parseCodes) {
      expect(dc.severity).toBe('error');
    }
  });

  it('schema error codes for unknown elements have a suggestion', () => {
    const dc = getDiagnosticCode('VEML200');
    expect(dc).toBeDefined();
    expect(dc!.suggestionTemplate).toBeTruthy();
  });

  it('VEML203 broken reference code is registered with correct properties', () => {
    const dc = getDiagnosticCode('VEML203');
    expect(dc).toBeDefined();
    expect(dc!.severity).toBe('error');
    expect(dc!.messageTemplate).toContain('{value}');
    expect(dc!.suggestionTemplate).toContain('{value}');
  });
});
