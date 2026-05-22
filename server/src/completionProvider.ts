/**
 * VEML schema-driven completion provider.
 * Returns CompletionItem arrays for element names, attribute names, and attribute values.
 */

import {
  getElementSchema,
  ELEMENT_SCHEMAS,
} from '../../shared/src/index.js';
import { getApiClass, API_CLASS_NAMES } from '../../shared/src/jsApiSchema.js';
import type { CompletionContext } from './completionContext.js';
import type { ScriptIndex } from './scriptIndex.js';

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
export interface CompletionOptions {
  existingAttributes?: string[];
  scriptIndex?: ScriptIndex;
  vemlUri?: string;
}

export function handleCompletion(ctx: CompletionContext, existingAttributesOrOptions?: string[] | CompletionOptions): CompletionItem[] {
  // Support both old signature (string[]) and new options object
  const options: CompletionOptions = Array.isArray(existingAttributesOrOptions)
    ? { existingAttributes: existingAttributesOrOptions }
    : existingAttributesOrOptions ?? {};

  switch (ctx.kind) {
    case 'element':
      return elementCompletions(ctx.parentTagName);
    case 'attributeName':
      return attributeNameCompletions(ctx.currentTagName, options.existingAttributes);
    case 'attributeValue':
      return attributeValueCompletions(ctx.currentTagName, ctx.attributeName, options.scriptIndex, options.vemlUri);
    case 'scriptContent':
      return scriptContentCompletions(ctx.scriptText, ctx.scriptOffset);
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
/** Attribute names that reference JS function names. */
const EVENT_HANDLER_ATTRIBUTES = new Set(['on-load-event', 'on-click']);

function attributeValueCompletions(tagName?: string, attributeName?: string, scriptIndex?: ScriptIndex, vemlUri?: string): CompletionItem[] {
  if (!tagName || !attributeName) return [];

  // Event handler attributes — suggest JS function names
  if (EVENT_HANDLER_ATTRIBUTES.has(attributeName) && scriptIndex && vemlUri) {
    const funcs = scriptIndex.getAllFunctionsForVeml(vemlUri);
    return funcs.map((fn, idx) => {
      const filename = fn.uri.split('/').pop() ?? fn.uri;
      return {
        label: `${fn.name}();`,
        kind: 'value' as const,
        detail: `from ${filename}`,
        insertText: `${fn.name}();`,
        sortText: `${idx}-${fn.name}`,
      };
    });
  }

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
 * Script content completions — suggest WebVerse API methods based on partial text.
 * Uses schema-driven fallback: if cursor is after "ClassName.", return that class's methods.
 * If cursor is at word boundary, suggest all API class names.
 */
function scriptContentCompletions(scriptText?: string, scriptOffset?: number): CompletionItem[] {
  if (!scriptText || scriptOffset === undefined) return [];

  // Get the text before cursor
  const textBefore = scriptText.substring(0, scriptOffset);

  // Check for "ClassName." pattern — suggest methods
  const dotMatch = textBefore.match(/\b([A-Z]\w*)\.\s*(\w*)$/);
  if (dotMatch) {
    const className = dotMatch[1];
    const partial = dotMatch[2] || '';
    const classSchema = getApiClass(className);
    if (classSchema) {
      const items: CompletionItem[] = [];
      let idx = 0;

      // Methods
      for (const method of classSchema.methods) {
        if (partial && !method.name.toLowerCase().startsWith(partial.toLowerCase())) continue;
        const sig = method.overloads[0];
        const params = sig ? sig.params.map((p) => p.name).join(', ') : '';
        items.push({
          label: method.name,
          kind: 'value',
          detail: `${method.isStatic ? 'static ' : ''}${method.name}(${params}): ${sig?.returnType ?? 'void'}`,
          documentation: `${className}.${method.name}`,
          insertText: `${method.name}($0)`,
          insertTextFormat: 'snippet',
          sortText: `${idx++}-${method.name}`,
        });
      }

      // Properties
      for (const prop of classSchema.properties) {
        if (partial && !prop.name.toLowerCase().startsWith(partial.toLowerCase())) continue;
        items.push({
          label: prop.name,
          kind: 'property',
          detail: `${prop.readonly ? 'readonly ' : ''}${prop.name}: ${prop.type}`,
          sortText: `${idx++}-${prop.name}`,
        });
      }

      return items;
    }
  }

  // Check for "new ClassName(" — suggest constructable classes
  const newMatch = textBefore.match(/\bnew\s+(\w*)$/);
  if (newMatch) {
    const partial = newMatch[1] || '';
    return API_CLASS_NAMES
      .filter((name) => {
        if (partial && !name.toLowerCase().startsWith(partial.toLowerCase())) return false;
        const schema = getApiClass(name);
        return schema?.isConstructable === true;
      })
      .map((name, idx) => ({
        label: name,
        kind: 'value' as const,
        detail: getApiClass(name)!.description,
        sortText: `${idx}-${name}`,
      }));
  }

  // At word boundary with capital letter — suggest API class names
  const wordMatch = textBefore.match(/\b([A-Z]\w*)$/);
  if (wordMatch) {
    const partial = wordMatch[1];
    return API_CLASS_NAMES
      .filter((name) => name.toLowerCase().startsWith(partial.toLowerCase()))
      .map((name, idx) => ({
        label: name,
        kind: 'value' as const,
        detail: getApiClass(name)!.description,
        sortText: `${idx}-${name}`,
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
