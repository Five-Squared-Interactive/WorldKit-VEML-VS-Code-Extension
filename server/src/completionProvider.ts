/**
 * VEML schema-driven completion provider.
 * Returns CompletionItem arrays for element names, attribute names, and attribute values.
 */

import {
  getElementSchema,
  ELEMENT_SCHEMAS,
} from '../../shared/src/index.js';
import type { CompletionContext } from './completionContext.js';

export interface CompletionItem {
  label: string;
  kind: 'element' | 'property' | 'enum' | 'value';
  detail?: string;
  documentation?: string;
  insertText?: string;
  insertTextFormat?: 'plainText' | 'snippet';
  sortText?: string;
}

/**
 * Produce completion items based on the detected context.
 * All data comes from the static schema — no I/O.
 *
 * @param ctx Completion context from getCompletionContext()
 * @param existingAttributes Optional list of attribute names already present on the element (to filter out)
 */
export function handleCompletion(ctx: CompletionContext, existingAttributes?: string[]): CompletionItem[] {
  switch (ctx.kind) {
    case 'element':
      return elementCompletions(ctx.parentTagName);
    case 'attributeName':
      return attributeNameCompletions(ctx.currentTagName, existingAttributes);
    case 'attributeValue':
      return attributeValueCompletions(ctx.currentTagName, ctx.attributeName);
    case 'none':
      return [];
  }
}

/**
 * Element name completions — suggest valid child elements for the parent.
 */
function elementCompletions(parentTagName?: string): CompletionItem[] {
  if (parentTagName) {
    const parentSchema = getElementSchema(parentTagName);
    if (parentSchema) {
      if (parentSchema.allowedChildren.length === 0) return [];
      return parentSchema.allowedChildren.map((childTag) => {
        const childSchema = getElementSchema(childTag);
        const isLeaf = childSchema ? childSchema.allowedChildren.length === 0 : false;
        return {
          label: childTag,
          kind: 'element' as const,
          detail: childSchema?.description,
          documentation: childSchema ? formatElementDoc(childSchema.tagName) : undefined,
          insertText: isLeaf ? `${childTag} $1/>` : `${childTag}$1>$0</${childTag}>`,
          insertTextFormat: 'snippet' as const,
          sortText: `0-${childTag}`,
        };
      });
    }
    // Unknown parent — fall through to all elements
  }

  // No parent or unknown parent — suggest all elements
  return ELEMENT_SCHEMAS.map((schema) => {
    const isLeaf = schema.allowedChildren.length === 0;
    return {
      label: schema.tagName,
      kind: 'element' as const,
      detail: schema.description,
      insertText: isLeaf ? `${schema.tagName} $1/>` : `${schema.tagName}$1>$0</${schema.tagName}>`,
      insertTextFormat: 'snippet' as const,
      sortText: `1-${schema.tagName}`,
    };
  });
}

/**
 * Attribute name completions — suggest valid attributes for the element.
 */
function attributeNameCompletions(tagName?: string, existingAttributes?: string[]): CompletionItem[] {
  if (!tagName) return [];
  const schema = getElementSchema(tagName);
  if (!schema) return [];

  const existing = new Set(existingAttributes || []);
  const items: CompletionItem[] = [];

  // Required attributes first
  for (const attr of schema.requiredAttributes) {
    if (existing.has(attr)) continue;
    items.push({
      label: attr,
      kind: 'property',
      detail: `(required) ${attr}`,
      insertText: `${attr}="$1"`,
      insertTextFormat: 'snippet',
      sortText: `0-${attr}`,
    });
  }

  // Optional attributes
  for (const attr of schema.optionalAttributes) {
    if (existing.has(attr.name)) continue;
    items.push({
      label: attr.name,
      kind: 'property',
      detail: attr.description,
      documentation: attr.enumValues ? `Values: ${attr.enumValues.join(', ')}` : `Type: ${attr.type}`,
      insertText: `${attr.name}="$1"`,
      insertTextFormat: 'snippet',
      sortText: `1-${attr.name}`,
    });
  }

  return items;
}

/**
 * Attribute value completions — suggest valid values for enum/boolean attributes.
 */
function attributeValueCompletions(tagName?: string, attributeName?: string): CompletionItem[] {
  if (!tagName || !attributeName) return [];
  const schema = getElementSchema(tagName);
  if (!schema) return [];

  // Check optional attributes for enum values
  const attr = schema.optionalAttributes.find((a) => a.name === attributeName);
  if (!attr) return [];

  // Boolean attributes
  if (attr.type === 'boolean') {
    return [
      { label: 'true', kind: 'enum', sortText: '0-true' },
      { label: 'false', kind: 'enum', sortText: '1-false' },
    ];
  }

  // Enum values
  if (attr.enumValues && attr.enumValues.length > 0) {
    return attr.enumValues.map((val, idx) => ({
      label: val,
      kind: 'enum' as const,
      sortText: `${idx}-${val}`,
    }));
  }

  return [];
}

/**
 * Format element documentation string.
 */
function formatElementDoc(tagName: string): string {
  const schema = getElementSchema(tagName);
  if (!schema) return '';
  const parts: string[] = [];
  if (schema.allowedChildren.length > 0) {
    parts.push(`Children: ${schema.allowedChildren.join(', ')}`);
  }
  if (schema.requiredAttributes.length > 0) {
    parts.push(`Required: ${schema.requiredAttributes.join(', ')}`);
  }
  if (schema.optionalAttributes.length > 0) {
    parts.push(`Optional: ${schema.optionalAttributes.map((a) => a.name).join(', ')}`);
  }
  return parts.join('\n');
}
