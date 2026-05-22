/**
 * Completion context detection for VEML documents.
 * Scans backwards from cursor position to determine what kind of completion to provide.
 */

import { isFilePath } from './textContentUtils.js';

export interface CompletionContext {
  kind: 'element' | 'attributeName' | 'attributeValue' | 'scriptContent' | 'none';
  parentTagName?: string;
  currentTagName?: string;
  attributeName?: string;
  partialText?: string;
  /** For scriptContent: the extracted inline JS text. */
  scriptText?: string;
  /** For scriptContent: cursor offset within the JS text. */
  scriptOffset?: number;
}

const NONE: CompletionContext = Object.freeze({ kind: 'none' }) as CompletionContext;

/**
 * Determine what kind of completion to provide based on cursor position in raw text.
 * Uses text-based backward scanning — robust even when AST is stale or has errors.
 */
export function getCompletionContext(text: string, offset: number): CompletionContext {
  if (text.length === 0 || offset < 0) return NONE;

  // Check if cursor is inside an inline <script> block
  const scriptCtx = findInlineScriptContext(text, offset);
  if (scriptCtx) return scriptCtx;

  // Check if inside a comment
  if (isInsideComment(text, offset)) return NONE;

  // Find the nearest unclosed '<' scanning backwards
  const tagStart = findUnclosedOpenAngle(text, offset);
  if (tagStart === -1) return NONE;

  // Get the text between '<' and cursor
  const tagContent = text.slice(tagStart + 1, offset);

  // Check if this is a closing tag (starts with /)
  if (tagContent.startsWith('/')) return NONE;

  // Parse the tag content to determine context
  return parseTagContent(tagContent, text, tagStart);
}

/**
 * Check if offset is inside an XML comment (<!-- ... -->).
 */
function isInsideComment(text: string, offset: number): boolean {
  let i = 0;
  while (i < offset) {
    const commentStart = text.indexOf('<!--', i);
    if (commentStart === -1 || commentStart >= offset) break;
    const commentEnd = text.indexOf('-->', commentStart + 4);
    if (commentEnd === -1 || commentEnd + 3 > offset) {
      // Inside an unclosed comment or offset is within this comment
      return offset > commentStart;
    }
    i = commentEnd + 3;
  }
  return false;
}

/**
 * Scan backwards from offset to find the nearest '<' that isn't closed by '>'.
 * Respects quoted attribute values — a '>' inside quotes doesn't close the tag.
 * Returns -1 if no unclosed '<' is found.
 */
function findUnclosedOpenAngle(text: string, offset: number): number {
  // Determine if cursor is already inside a quoted attribute value
  // by scanning forward: if we find '"' before an unquoted '>', we're inside quotes
  let inQuote = isCursorInsideQuotes(text, offset);
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (text[i] === '>') return -1;
    if (text[i] === '<') return i;
  }
  return -1;
}

/**
 * Check if the cursor at offset is inside a quoted attribute value.
 * Scans forward first; if inconclusive (end of text), counts quotes
 * backward from offset to the nearest '<' — odd count means inside quotes.
 */
function isCursorInsideQuotes(text: string, offset: number): boolean {
  // Forward scan: closing '"' before '>' or '<' means inside quotes
  for (let i = offset; i < text.length; i++) {
    if (text[i] === '"') return true;
    if (text[i] === '<' || text[i] === '>') return false;
  }
  // End of text reached — fall back to counting quotes between nearest '<' and offset
  let quoteCount = 0;
  for (let i = offset - 1; i >= 0; i--) {
    if (text[i] === '<') break;
    if (text[i] === '"') quoteCount++;
  }
  return quoteCount % 2 === 1;
}

/**
 * Parse the content after '<' to determine if we're typing an element name,
 * an attribute name, or an attribute value.
 */
function parseTagContent(tagContent: string, fullText: string, tagStart: number): CompletionContext {
  // Match: optional tagName followed by optional whitespace + attributes
  const tagNameMatch = tagContent.match(/^([a-zA-Z_][\w.-]*)?/);
  const tagName = tagNameMatch?.[1] || '';
  const afterTagName = tagContent.slice(tagName.length);

  // If no whitespace after tag name, we're still typing the element name
  if (afterTagName.length === 0 || !afterTagName.match(/^\s/)) {
    // Element name completion
    const parentTag = findParentTagName(fullText, tagStart);
    return {
      kind: 'element',
      parentTagName: parentTag,
      partialText: tagName || undefined,
    };
  }

  // We have a tag name and space after it — attribute context
  // Check if we're inside an attribute value (between quotes)
  const attrValueCtx = findAttributeValueContext(afterTagName);
  if (attrValueCtx) {
    return {
      kind: 'attributeValue',
      currentTagName: tagName,
      attributeName: attrValueCtx.attrName,
      partialText: attrValueCtx.partialValue || undefined,
    };
  }

  // We're in attribute name position
  const partialAttr = extractPartialAttributeName(afterTagName);
  return {
    kind: 'attributeName',
    currentTagName: tagName,
    partialText: partialAttr || undefined,
  };
}

/**
 * Check if we're inside an attribute value (between quotes).
 * Walks character-by-character through the text after the tag name.
 */
function findAttributeValueContext(afterTagName: string): { attrName: string; partialValue: string } | null {
  let i = 0;
  const len = afterTagName.length;

  while (i < len) {
    // Skip whitespace
    while (i < len && /\s/.test(afterTagName[i])) i++;
    if (i >= len) break;

    // Try to match attribute name
    const nameStart = i;
    while (i < len && /[\w.-]/.test(afterTagName[i])) i++;
    if (i === nameStart) break; // not an attribute name

    const attrName = afterTagName.slice(nameStart, i);

    // Skip whitespace before =
    while (i < len && /\s/.test(afterTagName[i])) i++;

    // Check for =
    if (i >= len || afterTagName[i] !== '=') {
      // No = sign — this might be a partial attribute name or end of input
      // If we're at the end, this is NOT a value context
      continue;
    }
    i++; // skip =

    // Skip whitespace after =
    while (i < len && /\s/.test(afterTagName[i])) i++;

    // Check for opening quote
    if (i >= len || afterTagName[i] !== '"') continue;
    i++; // skip opening "

    // Read value until closing quote or end
    const valueStart = i;
    while (i < len && afterTagName[i] !== '"') i++;

    if (i >= len) {
      // No closing quote — cursor is inside this attribute value
      return { attrName, partialValue: afterTagName.slice(valueStart) };
    }

    i++; // skip closing "
    // Attribute was fully closed, continue to next attribute
  }

  return null;
}

/**
 * Extract partial attribute name being typed (last word after whitespace).
 */
function extractPartialAttributeName(afterTagName: string): string {
  // Remove fully-formed attributes (name="value") and self-closing /
  const cleaned = afterTagName
    .replace(/\s+[a-zA-Z_][\w.-]*\s*=\s*"[^"]*"/g, '')
    .replace(/\s*\/?$/, '');
  // What remains after last whitespace is the partial attribute name
  const match = cleaned.match(/\s+([a-zA-Z_][\w.-]*)$/);
  return match?.[1] || '';
}

/**
 * Find the parent element's tag name by scanning backwards through the document
 * to find the most recently opened (and not yet closed) tag.
 * Handles '>' inside quoted attribute values correctly.
 */
function findParentTagName(text: string, beforeOffset: number): string | undefined {
  const openTags: string[] = [];
  const slice = text.slice(0, beforeOffset);

  // Scan character-by-character to find complete tags, respecting quotes
  let i = 0;
  while (i < slice.length) {
    if (slice[i] !== '<') { i++; continue; }

    i++; // skip '<'
    if (i >= slice.length) break;

    const isClosing = slice[i] === '/';
    if (isClosing) i++;

    // Read tag name
    const nameStart = i;
    while (i < slice.length && /[\w.-]/.test(slice[i])) i++;
    const tagName = slice.slice(nameStart, i);
    if (!tagName) { continue; } // not a real tag (e.g., `< `)

    // Skip attributes and content until '>' (respecting quotes)
    let inQuote = false;
    let selfClosing = false;
    while (i < slice.length) {
      if (slice[i] === '"') { inQuote = !inQuote; i++; continue; }
      if (inQuote) { i++; continue; }
      if (slice[i] === '/' && i + 1 < slice.length && slice[i + 1] === '>') {
        selfClosing = true;
        i += 2;
        break;
      }
      if (slice[i] === '>') { i++; break; }
      i++;
    }

    // If we never found '>', this is an incomplete tag — skip
    if (i === slice.length && slice[i - 1] !== '>') continue;

    if (isClosing) {
      const idx = openTags.lastIndexOf(tagName);
      if (idx !== -1) openTags.splice(idx, 1);
    } else if (!selfClosing) {
      openTags.push(tagName);
    }
  }

  return openTags.length > 0 ? openTags[openTags.length - 1] : undefined;
}

/**
 * Check if the cursor is inside an inline <script> block.
 * Scans backward for <script> opening tag and forward for </script>.
 * Returns scriptContent context if cursor is between them and content is not a file path.
 */
function findInlineScriptContext(text: string, offset: number): CompletionContext | null {
  // Find the most recent <script> or <script ...> opening tag before offset
  const openPattern = /<script(?:\s[^>]*)?>|<\/script>/gi;
  let lastOpenEnd = -1;

  let match: RegExpExecArray | null;
  while ((match = openPattern.exec(text)) !== null) {
    if (match.index >= offset) break;
    if (match[0].startsWith('</')) {
      lastOpenEnd = -1; // Reset — we passed a closing tag
    } else {
      lastOpenEnd = match.index + match[0].length;
    }
  }

  if (lastOpenEnd === -1 || lastOpenEnd > offset) return null;

  // Find the next </script> after the cursor
  const closeIdx = text.indexOf('</script>', offset);
  if (closeIdx === -1) return null;

  // Extract the content between the opening tag and closing tag
  const content = text.substring(lastOpenEnd, closeIdx);
  const trimmed = content.trim();

  // If it looks like a file path, it's not inline JS
  if (trimmed.length > 0 && isFilePath(trimmed)) return null;

  return {
    kind: 'scriptContent',
    scriptText: content,
    scriptOffset: offset - lastOpenEnd,
  };
}
