/**
 * VemlDiagnostic type, factory, and LSP converter.
 * All diagnostics must be created through createDiagnostic() using a registered code.
 */

import { DiagnosticSeverity, type Diagnostic } from 'vscode-languageserver/node';
import { getDiagnosticCode } from './diagnosticCodes.js';
import type { SourceRange } from './ast.types.js';

export interface VemlDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info' | 'hint';
  readonly range: SourceRange;
  readonly message: string;
  readonly suggestion: string | undefined;
  readonly source: 'worldkit-veml';
}

/**
 * Resolve template placeholders like {element} with provided args.
 */
function resolveTemplate(template: string, args: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => args[key] ?? match);
}

/**
 * Create a VemlDiagnostic from a registered code.
 * Throws if the code is not registered.
 */
export function createDiagnostic(
  codeId: string,
  range: SourceRange,
  templateArgs: Record<string, string>,
): VemlDiagnostic {
  const dc = getDiagnosticCode(codeId);
  if (!dc) {
    throw new Error(`Unknown diagnostic code: ${codeId}`);
  }

  return {
    code: dc.code,
    severity: dc.severity,
    range,
    message: resolveTemplate(dc.messageTemplate, templateArgs),
    suggestion: dc.suggestionTemplate
      ? resolveTemplate(dc.suggestionTemplate, templateArgs)
      : undefined,
    source: 'worldkit-veml',
  };
}

const SEVERITY_MAP: Record<string, DiagnosticSeverity> = {
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
  info: DiagnosticSeverity.Information,
  hint: DiagnosticSeverity.Hint,
};

/**
 * Convert a VemlDiagnostic to an LSP Diagnostic.
 * Converts 1-based SourceRange lines to 0-based LSP Range lines.
 */
export function toLspDiagnostic(diag: VemlDiagnostic): Diagnostic {
  const message = diag.suggestion
    ? `${diag.message}\n${diag.suggestion}`
    : diag.message;

  return {
    range: {
      start: { line: diag.range.start.line - 1, character: diag.range.start.column },
      end: { line: diag.range.end.line - 1, character: diag.range.end.column },
    },
    severity: SEVERITY_MAP[diag.severity],
    code: diag.code,
    source: diag.source,
    message,
  };
}
