/**
 * VEML document formatting provider.
 * Reconstructs document text from the AST with consistent indentation.
 */

import { NodeKind } from '../../shared/src/nodeKind.js';
import type { VemlDocument, VemlNode, VemlAttribute } from '../../shared/src/index.js';

export interface FormattingOptions {
  tabSize: number;
  insertSpaces: boolean;
}

export interface TextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

/** Node kinds that are structural wrappers, not emitted as tags. */
const STRUCTURAL_KINDS = new Set<NodeKind>([NodeKind.Document]);

/** Node kinds that should be preserved verbatim from source text. */
const VERBATIM_KINDS = new Set<NodeKind>([
  NodeKind.Error,
  NodeKind.CData,
]);

/**
 * Format a parsed VEML document and return text edits.
 * Returns a single edit replacing the full document, or empty array if nothing to format.
 */
export function formatDocument(doc: VemlDocument, options: FormattingOptions): TextEdit[] {
  if (!doc.root) return [];

  const indent = options.insertSpaces ? ' '.repeat(options.tabSize) : '\t';
  const eol = detectLineEnding(doc.text);
  const lines: string[] = [];

  formatNode(doc.root, 0, indent, eol, lines, doc.text);

  // If formatting produced no meaningful output, return no edits
  const formatted = lines.join(eol);
  if (formatted.trim().length === 0) return [];

  // Count lines in original document for the replacement range
  const originalLines = doc.text.split(/\r\n|\r|\n/);
  const lastLine = originalLines[originalLines.length - 1];

  return [{
    range: {
      start: { line: 0, character: 0 },
      end: { line: originalLines.length - 1, character: lastLine.length },
    },
    newText: formatted,
  }];
}

/**
 * Detect the dominant line ending in the source text.
 */
function detectLineEnding(text: string): string {
  const crlfCount = (text.match(/\r\n/g) ?? []).length;
  const lfCount = (text.match(/(?<!\r)\n/g) ?? []).length;
  if (crlfCount === 0 && lfCount === 0) return '\n';
  return crlfCount > lfCount ? '\r\n' : '\n';
}

/**
 * Recursively format a node and append lines to the output.
 */
function formatNode(
  node: VemlNode,
  depth: number,
  indent: string,
  eol: string,
  lines: string[],
  text: string,
): void {
  // Structural nodes (Document): just format children without emitting tags
  if (STRUCTURAL_KINDS.has(node.kind)) {
    for (const child of node.children) {
      formatNode(child, depth, indent, eol, lines, text);
    }
    return;
  }

  // Verbatim nodes (Error, CData): preserve raw text
  if (VERBATIM_KINDS.has(node.kind)) {
    const raw = text.slice(node.range.start.offset, node.range.end.offset);
    const rawLines = raw.split(/\r\n|\r|\n/);
    for (const rawLine of rawLines) {
      lines.push(rawLine);
    }
    return;
  }

  // Comment nodes: re-indent but preserve content
  if (node.kind === NodeKind.Comment) {
    const raw = text.slice(node.range.start.offset, node.range.end.offset);
    const prefix = indent.repeat(depth);
    const rawLines = raw.split(/\r\n|\r|\n/);
    for (const rawLine of rawLines) {
      lines.push(prefix + rawLine.trimStart());
    }
    return;
  }

  // ProcessingInstruction nodes: re-indent but preserve content
  if (node.kind === NodeKind.ProcessingInstruction) {
    const raw = text.slice(node.range.start.offset, node.range.end.offset);
    const prefix = indent.repeat(depth);
    lines.push(prefix + raw.trim());
    return;
  }

  // Element nodes: format with proper indentation
  const prefix = indent.repeat(depth);
  const hasChildren = node.children.length > 0;

  if (hasChildren) {
    // Container element: opening tag, children, closing tag
    lines.push(prefix + formatOpeningTag(node, depth, indent, eol));
    for (const child of node.children) {
      formatNode(child, depth + 1, indent, eol, lines, text);
    }
    lines.push(prefix + `</${node.tagName}>`);
  } else {
    // Self-closing element
    lines.push(prefix + formatSelfClosingTag(node, depth, indent, eol));
  }
}

/**
 * Format the opening tag of a container element.
 */
function formatOpeningTag(node: VemlNode, depth: number, indent: string, eol: string): string {
  if (node.attributes.length === 0) {
    return `<${node.tagName}>`;
  }

  if (node.attributes.length === 1) {
    return `<${node.tagName} ${formatAttr(node.attributes[0])}>`;
  }

  // Multi-attribute: one per line
  const attrIndent = indent.repeat(depth + 1);
  const attrLines = node.attributes.map((a) => attrIndent + formatAttr(a));
  return `<${node.tagName}${eol}${attrLines.join(eol)}>`;
}

/**
 * Format a self-closing element tag.
 */
function formatSelfClosingTag(node: VemlNode, depth: number, indent: string, eol: string): string {
  if (node.attributes.length === 0) {
    return `<${node.tagName} />`;
  }

  if (node.attributes.length === 1) {
    return `<${node.tagName} ${formatAttr(node.attributes[0])} />`;
  }

  // Multi-attribute: one per line
  const attrIndent = indent.repeat(depth + 1);
  const attrLines = node.attributes.map((a) => attrIndent + formatAttr(a));
  return `<${node.tagName}${eol}${attrLines.join(eol)} />`;
}

/**
 * Format a single attribute as name="value".
 */
function formatAttr(attr: VemlAttribute): string {
  return `${attr.name}="${attr.value}"`;
}
