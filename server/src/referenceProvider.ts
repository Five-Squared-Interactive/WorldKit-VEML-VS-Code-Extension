/**
 * Find-all-references provider for VEML entities.
 * Finds all locations where an entity ID is referenced via ref="..." attributes.
 */

import type { VemlDocument, SourceRange } from '../../shared/src/index.js';
import type { EntityIndex } from './entityIndex.js';
import { findAttributeValueAtOffset } from './definitionProvider.js';

export interface ReferenceLocation {
  uri: string;
  range: SourceRange;
}

/**
 * Find all references to the entity at the given offset.
 * Works from both `id="..."` and `ref="..."` attribute values.
 */
export function handleReferences(
  doc: VemlDocument,
  offset: number,
  entityIndex: EntityIndex,
  includeDeclaration: boolean,
): ReferenceLocation[] {
  if (!doc.root) return [];

  const hit = findAttributeValueAtOffset(doc.root, offset);
  if (!hit) return [];

  const { attribute } = hit;

  // Only resolve from id or ref attributes
  if (attribute.name !== 'id' && attribute.name !== 'ref') return [];

  const entityId = attribute.value;
  if (!entityId) return [];

  const locations: ReferenceLocation[] = [];

  // Add all references
  const refs = entityIndex.getReferences(entityId);
  for (const ref of refs) {
    locations.push({ uri: ref.uri, range: ref.range });
  }

  // Optionally include the declaration itself
  if (includeDeclaration) {
    const def = entityIndex.getDefinition(entityId);
    if (def) {
      locations.push({ uri: def.uri, range: def.range });
    }
  }

  return locations;
}
