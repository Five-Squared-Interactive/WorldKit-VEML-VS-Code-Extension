/**
 * Pure function handler for querying entities from the entity index.
 * No LSP or VS Code API — this is a pure transform.
 */

import type { EntityIndex } from './entityIndex.js';
import type { EntityInfo, EntityQueryFilter } from '../../shared/src/apiTypes.js';
import { toEntityInfo } from './entityInfoMapper.js';

/**
 * Query entities from the index, applying optional filter criteria.
 * Returns serializable EntityInfo objects (no circular references).
 */
export function queryEntities(
  entityIndex: EntityIndex,
  filter?: EntityQueryFilter,
): EntityInfo[] {
  const allDefs = entityIndex.getAllDefinitions();

  const results: EntityInfo[] = [];
  for (const def of allDefs) {
    const info = toEntityInfo(def);

    if (filter?.type !== undefined && info.type !== filter.type) {
      continue;
    }
    if (filter?.idPrefix !== undefined && !def.id.startsWith(filter.idPrefix)) {
      continue;
    }

    results.push(info);
  }

  return results;
}
