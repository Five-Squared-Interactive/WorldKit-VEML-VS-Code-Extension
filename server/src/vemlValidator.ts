/**
 * VEML document validator.
 * Walks the AST to produce VemlDiagnostic[] from parse errors, schema violations,
 * missing required attributes, and invalid nesting.
 */

import { NodeKind } from '../../shared/src/nodeKind.js';
import type { VemlDocument, VemlNode } from '../../shared/src/ast.types.js';
import { visitNode, isDocumentNode } from '../../shared/src/nodeUtils.js';
import { createDiagnostic } from '../../shared/src/diagnostics.js';
import type { VemlDiagnostic } from '../../shared/src/diagnostics.js';
import { getElementSchema } from '../../shared/src/vemlSchema.js';
import type { EntityIndex } from './entityIndex.js';

/** Structural node kinds that should not be validated as elements. */
const STRUCTURAL_KINDS = new Set<NodeKind>([
  NodeKind.Document,
  NodeKind.Comment,
  NodeKind.CData,
  NodeKind.ProcessingInstruction,
  NodeKind.Error,
]);

/**
 * Result of classifying a SAX error message into a VEML diagnostic code.
 */
interface ParseErrorClassification {
  code: string;
  templateArgs: Record<string, string>;
}

/**
 * Classify an ErrorNode's errorMessage into a specific VEML parse error code
 * and extract relevant template arguments from the message.
 */
function classifyParseError(errorMessage: string, tagName: string): ParseErrorClassification {
  const msg = errorMessage.toLowerCase();

  // VEML001: unclosed tag
  if (msg.includes('unclosed') || msg.includes('not closed') || msg.includes('unexpected end')) {
    return { code: 'VEML001', templateArgs: { element: tagName || 'unknown' } };
  }

  // VEML002: mismatched closing tag — extract expected/found from saxes message
  // saxes format: "closing tag </{found}> doesn't match opening tag </{expected}>"
  if (msg.includes('closing tag') || msg.includes('mismatch')) {
    const closingMatch = errorMessage.match(/<\/(\w+)>/g);
    let expected = tagName || 'unknown';
    let found = 'unknown';
    if (closingMatch && closingMatch.length >= 2) {
      found = closingMatch[0].replace(/<\/?|>/g, '');
      expected = closingMatch[1].replace(/<\/?|>/g, '');
    } else if (closingMatch && closingMatch.length === 1) {
      found = closingMatch[0].replace(/<\/?|>/g, '');
    }
    return { code: 'VEML002', templateArgs: { expected, found } };
  }

  // VEML003: malformed attribute — match "attribute" preceded by qualifier words
  if (msg.includes('malformed attribute') || msg.includes('attribute name') || msg.includes('duplicate attribute')) {
    return { code: 'VEML003', templateArgs: { element: tagName || 'unknown' } };
  }

  // VEML004: unterminated string literal
  if (msg.includes('unterminated string') || msg.includes('unterminated attribute')) {
    return { code: 'VEML004', templateArgs: { element: tagName || 'unknown' } };
  }

  // VEML005: invalid XML character
  if (msg.includes('invalid character') || msg.includes('disallowed character')) {
    return { code: 'VEML005', templateArgs: { detail: errorMessage } };
  }

  // VEML006: generic fallback
  return { code: 'VEML006', templateArgs: { detail: errorMessage } };
}

/**
 * Validate a parsed VEML document and return all diagnostics.
 *
 * Checks:
 * 1. Parse errors from ErrorNodes → VEML0xx codes
 * 2. Unknown elements → VEML200
 * 3. Missing required attributes → VEML100
 * 4. Invalid nesting → VEML201
 * 5. Broken entity references → VEML203 (when entityIndex provided)
 */
export function validateDocument(doc: VemlDocument, entityIndex?: EntityIndex): VemlDiagnostic[] {
  const diagnostics: VemlDiagnostic[] = [];

  // 1. Extract parse errors from ErrorNodes
  for (const errorNode of doc.errors) {
    const { code, templateArgs } = classifyParseError(errorNode.errorMessage, errorNode.tagName);
    diagnostics.push(createDiagnostic(code, errorNode.range, templateArgs));
  }

  // 2–4. Walk AST for schema/validation checks
  if (doc.root) {
    visitNode(doc.root, {
      enter(node: VemlNode) {
        // Skip structural and error nodes
        if (STRUCTURAL_KINDS.has(node.kind)) {
          return; // continue into children (Document contains element children)
        }

        const tagName = node.tagName.toLowerCase();

        // 2. Unknown element check
        if (node.kind === NodeKind.Unknown) {
          diagnostics.push(
            createDiagnostic('VEML200', node.range, { element: tagName }),
          );
          return; // skip further checks for unknown elements
        }

        const schema = getElementSchema(tagName);
        if (!schema) {
          // Known NodeKind but no schema entry — treat as unknown
          diagnostics.push(
            createDiagnostic('VEML200', node.range, { element: tagName }),
          );
          return;
        }

        // 3. Required attribute check
        for (const requiredAttr of schema.requiredAttributes) {
          const hasAttr = node.attributes.some(
            (a) => a.name.toLowerCase() === requiredAttr.toLowerCase(),
          );
          if (!hasAttr) {
            diagnostics.push(
              createDiagnostic('VEML100', node.range, {
                attribute: requiredAttr,
                element: tagName,
              }),
            );
          }
        }

        // 4. Nesting validation — check if this element is allowed as child of its parent
        if (node.parent && !isDocumentNode(node.parent)) {
          const parentTagName = node.parent.tagName.toLowerCase();
          const parentSchema = getElementSchema(parentTagName);
          if (parentSchema && !parentSchema.allowedChildren.includes(tagName)) {
            diagnostics.push(
              createDiagnostic('VEML201', node.range, {
                element: tagName,
                parent: parentTagName,
              }),
            );
          }
        }

        // 5. Broken entity reference check (when entityIndex available)
        if (entityIndex) {
          for (const attr of node.attributes) {
            if (attr.name === 'ref' && attr.value) {
              const def = entityIndex.getDefinition(attr.value);
              if (!def) {
                diagnostics.push(
                  createDiagnostic('VEML203', attr.valueRange, { value: attr.value }),
                );
              }
            }
          }
        }
      },
    });
  }

  return diagnostics;
}
