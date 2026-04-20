import { describe, it, expect } from 'vitest';
import { createDiagnostic, toLspDiagnostic } from './diagnostics.js';
// VemlDiagnostic type used implicitly via createDiagnostic return type
import type { SourceRange } from './ast.types.js';
import { DiagnosticSeverity } from 'vscode-languageserver/node';

const testRange: SourceRange = {
  start: { line: 5, column: 2, offset: 42 },
  end: { line: 5, column: 10, offset: 50 },
};

describe('createDiagnostic', () => {
  it('creates a diagnostic from a known code with template args', () => {
    const diag = createDiagnostic('VEML001', testRange, { element: 'entity' });
    expect(diag.code).toBe('VEML001');
    expect(diag.severity).toBe('error');
    expect(diag.message).toBe('Unclosed tag <entity>');
    expect(diag.suggestion).toBe('Add a closing </entity> tag');
    expect(diag.range).toBe(testRange);
    expect(diag.source).toBe('worldkit-veml');
  });

  it('resolves template args in both message and suggestion', () => {
    const diag = createDiagnostic('VEML100', testRange, { attribute: 'id', element: 'entity' });
    expect(diag.message).toBe('Missing required attribute "id" on <entity>');
    expect(diag.suggestion).toBe('Add id="..." to the <entity> element');
  });

  it('handles codes with undefined suggestionTemplate', () => {
    const diag = createDiagnostic('VEML006', testRange, { detail: 'unexpected token' });
    expect(diag.suggestion).toBeUndefined();
  });

  it('throws for unknown diagnostic codes', () => {
    expect(() => createDiagnostic('VEML999', testRange, {})).toThrow();
  });

  it('leaves unreferenced placeholders as-is', () => {
    const diag = createDiagnostic('VEML001', testRange, {});
    expect(diag.message).toBe('Unclosed tag <{element}>');
  });
});

describe('toLspDiagnostic', () => {
  it('maps severity error to DiagnosticSeverity.Error', () => {
    const diag = createDiagnostic('VEML001', testRange, { element: 'entity' });
    const lsp = toLspDiagnostic(diag);
    expect(lsp.severity).toBe(DiagnosticSeverity.Error);
  });

  it('maps severity warning to DiagnosticSeverity.Warning', () => {
    const diag = createDiagnostic('VEML200', testRange, { element: 'foobar' });
    const lsp = toLspDiagnostic(diag);
    expect(lsp.severity).toBe(DiagnosticSeverity.Warning);
  });

  it('converts 1-based lines to 0-based LSP range', () => {
    const diag = createDiagnostic('VEML001', testRange, { element: 'entity' });
    const lsp = toLspDiagnostic(diag);
    expect(lsp.range.start.line).toBe(4); // 5 - 1
    expect(lsp.range.start.character).toBe(2);
    expect(lsp.range.end.line).toBe(4);
    expect(lsp.range.end.character).toBe(10);
  });

  it('includes code and source in LSP diagnostic', () => {
    const diag = createDiagnostic('VEML001', testRange, { element: 'entity' });
    const lsp = toLspDiagnostic(diag);
    expect(lsp.code).toBe('VEML001');
    expect(lsp.source).toBe('worldkit-veml');
    expect(lsp.message).toContain('Unclosed tag');
  });

  it('appends suggestion to message when present', () => {
    const diag = createDiagnostic('VEML001', testRange, { element: 'entity' });
    const lsp = toLspDiagnostic(diag);
    expect(lsp.message).toContain('Add a closing </entity> tag');
  });
});
