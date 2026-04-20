import type { VemlDocument } from '../../shared/src/index.js';
import { buildAst } from './astBuilder.js';

/**
 * Parse a VEML document string and return an immutable AST.
 *
 * @param text - The full text content of a VEML document.
 * @returns A VemlDocument with root node, error list, and source text.
 */
export function parseVeml(text: string): VemlDocument {
  return buildAst(text);
}
