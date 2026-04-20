import { SaxesParser, SaxesTagPlain } from 'saxes';
import {
  NodeKind,
  tagNameToKind,
  buildNodePath,
  deepFreeze,
} from '../../shared/src/index.js';
import type {
  ErrorNode,
  VemlDocument,
  VemlAttribute,
  MutableVemlNode,
  MutableErrorNode,
  SourcePosition,
} from '../../shared/src/index.js';

/**
 * Build a VEML AST from source text using a SAX streaming parser.
 */
export function buildAst(text: string): VemlDocument {
  const parser = new SaxesParser({ xmlns: false, position: true });
  const errors: MutableErrorNode[] = [];

  // Document root is a virtual container node
  const docRoot: MutableVemlNode = {
    kind: NodeKind.Document,
    path: '/',
    range: { start: pos(1, 0, 0), end: pos(1, 0, 0) },
    attributes: [],
    children: [],
    parent: undefined,
    tagName: '',
  };

  let current: MutableVemlNode = docRoot;

  parser.on('opentag', (tag: SaxesTagPlain) => {
    const kind = tagNameToKind(tag.name);
    const tagName = tag.name.toLowerCase();

    // Compute tag start position — parser.position is at the `>` char,
    // so the tag started at parser.position minus the full tag text length.
    const startOffset = findTagStartOffset(text, parser.position - 1, tagName);
    const startPos = offsetToPosition(text, startOffset);
    const endPos = currentParserPos(parser);

    const node: MutableVemlNode = {
      kind,
      path: '', // resolved after all siblings are known
      range: { start: startPos, end: endPos },
      attributes: extractAttributes(text, tag.attributes as Record<string, string>, startOffset, parser.position),
      children: [],
      parent: current,
      tagName,
    };

    current.children.push(node);

    if (!tag.isSelfClosing) {
      current = node;
    } else {
      // Self-closing: end range is at current parser position
      node.range.end = currentParserPos(parser);
    }
  });

  parser.on('closetag', (tag: SaxesTagPlain) => {
    // Self-closing tags already handled in opentag — don't pop the stack
    if (tag.isSelfClosing) return;
    if (current !== docRoot) {
      current.range.end = currentParserPos(parser);
      current = current.parent ?? docRoot;
    }
  });

  parser.on('error', (err: Error) => {
    const errPos = currentParserPos(parser);
    // Extract a context window of source text around the error location
    const contextStart = Math.max(0, errPos.offset - 20);
    const contextEnd = Math.min(text.length, errPos.offset + 20);
    const rawText = text.substring(contextStart, contextEnd);

    const errorNode: MutableErrorNode = {
      kind: NodeKind.Error,
      path: `${current.path}/error`,
      range: { start: errPos, end: errPos },
      attributes: [],
      children: [],
      parent: current,
      tagName: '',
      rawText,
      errorMessage: err.message,
    };
    current.children.push(errorNode);
    errors.push(errorNode);
    // saxes v6 continues automatically after errors — no resume() needed
  });

  // Write the text and close
  parser.write(text).close();

  // Update document root end range
  docRoot.range.end = offsetToPosition(text, text.length);

  // Finalize paths — now that all siblings are known, compute final counts
  finalizePaths(docRoot);

  // Deep freeze the tree
  const frozenRoot = deepFreeze(docRoot);

  return {
    root: frozenRoot,
    errors: errors.map((e) => {
      // Find the matching frozen error node by reference identity won't work after freeze,
      // so we just return the frozen version from the tree
      return e as unknown as ErrorNode;
    }),
    text,
  };
}

/**
 * Finalize paths after all children are known, using actual sibling counts.
 */
function finalizePaths(node: MutableVemlNode): void {
  // Count siblings by tag name
  const tagCounts = new Map<string, number>();
  for (const child of node.children) {
    if (child.tagName) {
      tagCounts.set(child.tagName, (tagCounts.get(child.tagName) ?? 0) + 1);
    }
  }

  // Track per-tag index as we iterate
  const tagIndices = new Map<string, number>();

  for (const child of node.children) {
    if (child.tagName) {
      const count = tagCounts.get(child.tagName) ?? 1;
      const index = tagIndices.get(child.tagName) ?? 0;
      tagIndices.set(child.tagName, index + 1);
      child.path = buildNodePath(node.path, child.tagName, index, count);
    } else if (child.kind === NodeKind.Error) {
      child.path = `${node.path}/error`;
    }

    finalizePaths(child);
  }
}

// ── Position Helpers ─────────────────────────────────────────────────

function pos(line: number, column: number, offset: number): SourcePosition {
  return { line, column, offset };
}

function currentParserPos(parser: SaxesParser): SourcePosition {
  return pos(parser.line, parser.column, parser.position);
}

/**
 * Convert a 0-based byte offset to a SourcePosition.
 * Handles both LF and CRLF line endings.
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
  return pos(line, offset - lastNewline - 1, offset);
}

/**
 * Find the offset of the `<` character for a given tag, searching backwards from
 * the parser's current position. Verifies that the `<` is followed by the expected
 * tag name (or `/` for self-closing variants) to avoid matching `<` inside attribute values.
 */
function findTagStartOffset(text: string, fromOffset: number, tagName: string): number {
  for (let i = fromOffset; i >= 0; i--) {
    if (text[i] === '<') {
      // Verify this `<` is followed by the tag name (case-insensitive)
      const after = text.substring(i + 1, i + 1 + tagName.length).toLowerCase();
      if (after === tagName) {
        return i;
      }
    }
  }
  return 0;
}

/**
 * Extract attribute source ranges from the original text within a tag span.
 */
function extractAttributes(
  text: string,
  attrs: Record<string, string>,
  tagStartOffset: number,
  tagEndOffset: number,
): VemlAttribute[] {
  const result: VemlAttribute[] = [];
  const tagText = text.substring(tagStartOffset, tagEndOffset + 1);

  for (const [name, value] of Object.entries(attrs)) {
    // Find attribute name in tag text
    const namePattern = new RegExp(`\\b(${escapeRegex(name)})\\s*=`, 'g');
    const nameMatch = namePattern.exec(tagText);
    if (!nameMatch) {
      // Fallback: create zero-range attribute
      const fallbackPos = offsetToPosition(text, tagStartOffset);
      result.push({
        name,
        value,
        nameRange: { start: fallbackPos, end: fallbackPos },
        valueRange: { start: fallbackPos, end: fallbackPos },
      });
      continue;
    }

    const nameStart = tagStartOffset + nameMatch.index;
    const nameEnd = nameStart + name.length;

    // Find attribute value — match the opening quote and find the matching closing quote
    const afterEquals = tagText.substring(nameMatch.index + nameMatch[0].length);
    const valuePattern = /(?:"([^"]*)"|'([^']*)')/;
    const valueMatch = valuePattern.exec(afterEquals);
    let valueStart: number;
    let valueEnd: number;
    if (valueMatch) {
      const valueContentOffset = nameMatch.index + nameMatch[0].length + valueMatch.index + 1; // +1 for opening quote
      valueStart = tagStartOffset + valueContentOffset;
      valueEnd = valueStart + value.length;
    } else {
      valueStart = nameEnd;
      valueEnd = nameEnd;
    }

    result.push({
      name,
      value,
      nameRange: {
        start: offsetToPosition(text, nameStart),
        end: offsetToPosition(text, nameEnd),
      },
      valueRange: {
        start: offsetToPosition(text, valueStart),
        end: offsetToPosition(text, valueEnd),
      },
    });
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
