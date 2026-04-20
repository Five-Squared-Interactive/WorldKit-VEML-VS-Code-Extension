/**
 * Hover documentation provider for VEML elements and attributes.
 * Shows schema descriptions, attribute details, and usage examples.
 */

import type { VemlDocument, VemlNode, VemlAttribute, SourceRange } from '../../shared/src/index.js';
import { visitNode, getElementSchema } from '../../shared/src/index.js';
import type { VemlElementSchema } from '../../shared/src/vemlSchema.js';

export interface HoverResult {
  contents: string;
  range: SourceRange;
}

/**
 * Find hover documentation for the element or attribute at the given offset.
 * Returns Markdown content and range, or null if nothing to show.
 */
export function handleHover(
  doc: VemlDocument,
  offset: number,
): HoverResult | null {
  if (!doc.root) return null;

  // Find the node containing the offset
  const node = findNodeAtOffset(doc.root, offset);
  if (!node) return null;

  // Priority 1: Check if cursor is on an attribute name
  const attrHover = tryAttributeNameHover(node, offset);
  if (attrHover) return attrHover;

  // Priority 2: Check if cursor is on a tag name
  const tagHover = tryTagNameHover(node, offset, doc.text);
  if (tagHover) return tagHover;

  return null;
}

/**
 * Find the deepest node whose range contains the offset.
 */
function findNodeAtOffset(root: VemlNode, offset: number): VemlNode | null {
  let result: VemlNode | null = null;

  visitNode(root, {
    enter(node) {
      if (offset < node.range.start.offset || offset >= node.range.end.offset) {
        return false; // skip children
      }
      result = node;
    },
  });

  return result;
}

/**
 * Check if the cursor is on an attribute name and return hover content.
 */
function tryAttributeNameHover(
  node: VemlNode,
  offset: number,
): HoverResult | null {
  for (const attr of node.attributes) {
    if (offset >= attr.nameRange.start.offset && offset < attr.nameRange.end.offset) {
      return buildAttributeHover(node, attr);
    }
  }
  return null;
}

/**
 * Check if the cursor is on a tag name and return hover content.
 */
function tryTagNameHover(
  node: VemlNode,
  offset: number,
  text: string,
): HoverResult | null {
  const tagNameRange = computeTagNameRange(node, text);
  if (!tagNameRange) return null;

  if (offset >= tagNameRange.start.offset && offset < tagNameRange.end.offset) {
    return buildTagHover(node, tagNameRange);
  }

  return null;
}

/**
 * Compute the source range for the tag name within the opening tag.
 * Scans from node start past '<' to find the tag name span.
 */
function computeTagNameRange(node: VemlNode, text: string): SourceRange | null {
  const start = node.range.start.offset;
  if (start >= text.length || text[start] !== '<') return null;

  // Skip '<'
  const nameStart = start + 1;

  // Find tag name end (first non-name character)
  let nameEnd = nameStart;
  while (nameEnd < text.length && /[\w.-]/.test(text[nameEnd])) {
    nameEnd++;
  }

  if (nameEnd === nameStart) return null;

  const tagName = text.slice(nameStart, nameEnd);
  if (tagName.toLowerCase() !== node.tagName.toLowerCase()) return null;

  return {
    start: { ...node.range.start, offset: nameStart, column: node.range.start.column + (nameStart - start) },
    end: { ...node.range.start, offset: nameEnd, column: node.range.start.column + (nameEnd - start) },
  };
}

/**
 * Build Markdown hover content for an element tag.
 */
function buildTagHover(node: VemlNode, tagNameRange: SourceRange): HoverResult | null {
  const schema = getElementSchema(node.tagName);
  if (!schema) return null;

  const lines: string[] = [];

  // Header with description
  lines.push(`**\`<${schema.tagName}>\`** — ${schema.description}`);
  lines.push('');

  // Required attributes
  if (schema.requiredAttributes.length > 0) {
    lines.push(`**Required:** ${schema.requiredAttributes.map((a) => `\`${a}\``).join(', ')}`);
  }

  // Optional attributes
  if (schema.optionalAttributes.length > 0) {
    lines.push(`**Optional:** ${schema.optionalAttributes.map((a) => `\`${a.name}\``).join(', ')}`);
  }

  // Allowed children
  if (schema.allowedChildren.length > 0) {
    lines.push(`**Children:** ${schema.allowedChildren.join(', ')}`);
  }

  // Usage example
  lines.push('');
  lines.push(buildUsageExample(schema));

  return {
    contents: lines.join('\n'),
    range: tagNameRange,
  };
}

/**
 * Build Markdown hover content for an attribute name.
 */
function buildAttributeHover(node: VemlNode, attr: VemlAttribute): HoverResult | null {
  const schema = getElementSchema(node.tagName);
  if (!schema) return null;

  // Check if it's a required attribute
  const isRequired = schema.requiredAttributes.includes(attr.name);

  // Check if it's an optional attribute with details
  const optAttr = schema.optionalAttributes.find((a) => a.name === attr.name);

  if (!isRequired && !optAttr) return null;

  const lines: string[] = [];

  if (optAttr) {
    lines.push(`**\`${attr.name}\`** — ${optAttr.description}`);
    lines.push('');
    lines.push(`**Type:** \`${optAttr.type}\``);
    lines.push(`**Required:** ${isRequired ? 'Yes' : 'No'}`);
    if (optAttr.enumValues && optAttr.enumValues.length > 0) {
      lines.push(`**Values:** ${optAttr.enumValues.map((v) => `\`${v}\``).join(', ')}`);
    }
  } else {
    // Required attribute with no optional details
    lines.push(`**\`${attr.name}\`** — Required attribute on \`<${node.tagName}>\``);
    lines.push('');
    lines.push(`**Required:** Yes`);
  }

  return {
    contents: lines.join('\n'),
    range: attr.nameRange,
  };
}

/**
 * Build a simple usage example for an element.
 */
function buildUsageExample(schema: VemlElementSchema): string {
  const attrs: string[] = [];
  for (const req of schema.requiredAttributes) {
    attrs.push(`${req}="..."`);
  }
  // Add first optional attribute with enum as example
  const enumAttr = schema.optionalAttributes.find((a) => a.enumValues && a.enumValues.length > 0);
  if (enumAttr) {
    attrs.push(`${enumAttr.name}="${enumAttr.enumValues![0]}"`);
  }

  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  const hasChildren = schema.allowedChildren.length > 0;

  if (hasChildren) {
    return `\`\`\`xml\n<${schema.tagName}${attrStr}>\n  ...\n</${schema.tagName}>\n\`\`\``;
  }
  return `\`\`\`xml\n<${schema.tagName}${attrStr} />\n\`\`\``;
}
