/**
 * Go-to-definition provider for VEML entity references.
 * Resolves entity `ref="..."` values to their `id="..."` definitions.
 */

import type { VemlDocument, VemlNode, VemlAttribute, SourceRange } from '../../shared/src/index.js';
import { visitNode } from '../../shared/src/index.js';
import type { EntityIndex } from './entityIndex.js';

export interface DefinitionLocation {
  uri: string;
  range: SourceRange;
}

/**
 * Find the definition for the entity reference at the given offset.
 * Returns the definition location, or null if the cursor isn't on a resolvable reference.
 */
export function handleDefinition(
  doc: VemlDocument,
  offset: number,
  entityIndex: EntityIndex,
): DefinitionLocation | null {
  if (!doc.root) return null;

  const hit = findAttributeValueAtOffset(doc.root, offset);
  if (!hit) return null;

  const { attribute } = hit;

  // Cursor is on a ref="..." value — resolve to the id definition
  if (attribute.name === 'ref') {
    const def = entityIndex.getDefinition(attribute.value);
    if (!def) return null;
    return { uri: def.uri, range: def.range };
  }

  // Cursor is on an id="..." value — resolve to self (identity navigation)
  if (attribute.name === 'id') {
    const def = entityIndex.getDefinition(attribute.value);
    if (!def) return null;
    return { uri: def.uri, range: def.range };
  }

  return null;
}

/**
 * Find the attribute whose valueRange contains the given offset.
 * Walks the AST depth-first and checks each attribute's valueRange.
 */
export function findAttributeValueAtOffset(
  root: VemlNode,
  offset: number,
): { node: VemlNode; attribute: VemlAttribute } | undefined {
  let result: { node: VemlNode; attribute: VemlAttribute } | undefined;
  let found = false;

  visitNode(root, {
    enter(node) {
      // Early termination — skip all remaining nodes after match (Finding 6)
      if (found) return false;

      // Skip nodes whose range doesn't contain the offset
      if (offset < node.range.start.offset || offset > node.range.end.offset) {
        return false; // skip children
      }

      for (const attr of node.attributes) {
        if (offset >= attr.valueRange.start.offset && offset < attr.valueRange.end.offset) {
          result = { node, attribute: attr };
          found = true;
          return false; // found it, stop traversal
        }
      }
    },
  });

  return result;
}
