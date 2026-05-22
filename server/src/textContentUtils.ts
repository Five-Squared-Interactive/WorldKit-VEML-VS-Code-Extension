/**
 * Utilities for extracting text content from VEML elements.
 * VEML's SAX-based AST doesn't capture text content directly,
 * so we extract it by scanning the raw document text using node ranges.
 */

import type { VemlNode, SourceRange, SourcePosition } from '../../shared/src/ast.types.js';

export interface TextContent {
  /** The trimmed text content between the opening and closing tags. */
  readonly text: string;
  /** Source range covering the text content (not the tags). */
  readonly range: SourceRange;
}

/**
 * Extract text content from a VEML node.
 * Works by finding the first `>` after the node's start offset (end of opening tag),
 * then finding `</` before the node's end offset (start of closing tag).
 *
 * Returns undefined for self-closing tags or empty content.
 */
export function getTextContent(node: VemlNode, docText: string): TextContent | undefined {
  const startOffset = node.range.start.offset;
  const endOffset = node.range.end.offset;

  // Find end of opening tag: first `>` after startOffset
  const openTagEnd = docText.indexOf('>', startOffset);
  if (openTagEnd === -1 || openTagEnd >= endOffset) return undefined;

  // Find start of closing tag: last `</` before endOffset
  // Use endOffset - 1 to avoid matching the next sibling's closing tag
  const closeTagStart = docText.lastIndexOf('</', endOffset - 1);
  if (closeTagStart === -1 || closeTagStart <= openTagEnd) return undefined;

  const contentStart = openTagEnd + 1;
  const contentEnd = closeTagStart;

  if (contentStart >= contentEnd) return undefined;

  const rawText = docText.substring(contentStart, contentEnd);
  const trimmed = rawText.trim();
  if (trimmed.length === 0) return undefined;

  // Build source range from content positions
  const startPos = offsetToPosition(docText, contentStart);
  const endPos = offsetToPosition(docText, contentEnd);

  return {
    text: trimmed,
    range: { start: startPos, end: endPos },
  };
}

/**
 * Check if text looks like a file path (not inline JS).
 * Returns true if:
 * - Ends with .js (case-insensitive)
 * - Does NOT contain { ; ( or newlines
 */
export function isFilePath(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.toLowerCase().endsWith('.js')) return false;
  if (/[{;(\n\r]/.test(trimmed)) return false;
  return true;
}

/**
 * Convert a 0-based offset to a SourcePosition.
 * Line is 1-based, column is 0-based.
 */
function offsetToPosition(text: string, offset: number): SourcePosition {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
      lastNewline = i;
    }
  }
  return { line, column: offset - lastNewline - 1, offset };
}
