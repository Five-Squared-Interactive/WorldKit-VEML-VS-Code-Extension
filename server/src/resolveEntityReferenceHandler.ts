/**
 * Pure function handler for resolving entity references from the entity index.
 * No LSP or VS Code API — this is a pure transform.
 */

import type { EntityIndex } from './entityIndex.js';
import type { EntityInfo } from '../../shared/src/apiTypes.js';
import { toEntityInfo } from './entityInfoMapper.js';

/**
 * Resolve a single entity reference by ID.
 * Returns serializable EntityInfo or undefined if not found.
 */
export function resolveEntityReference(
  entityIndex: EntityIndex,
  entityId: string,
): EntityInfo | undefined {
  const def = entityIndex.getDefinition(entityId);
  if (!def) return undefined;
  return toEntityInfo(def);
}
