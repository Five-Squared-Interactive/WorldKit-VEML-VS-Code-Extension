/**
 * Shared LSP utility functions for the VEML language server.
 */

import type { Range } from 'vscode-languageserver/node';
import type { SourceRange } from '../../shared/src/index.js';

/**
 * Convert a VEML SourceRange (1-based lines, 0-based columns)
 * to an LSP Range (0-based lines, 0-based characters).
 */
export function sourceRangeToLspRange(range: SourceRange): Range {
  return {
    start: { line: range.start.line - 1, character: range.start.column },
    end: { line: range.end.line - 1, character: range.end.column },
  };
}
