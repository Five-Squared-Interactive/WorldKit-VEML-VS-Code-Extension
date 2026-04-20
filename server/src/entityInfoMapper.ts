/**
 * Maps internal EntityDefinition to the public API's EntityInfo type.
 * Shared by queryEntitiesHandler and resolveEntityReferenceHandler.
 */

import type { EntityDefinition } from './entityIndex.js';
import type { EntityInfo } from '../../shared/src/apiTypes.js';

/**
 * Convert an EntityDefinition to a serializable EntityInfo.
 * Extracts the `type` attribute from the node and strips the VemlNode reference.
 */
export function toEntityInfo(def: EntityDefinition): EntityInfo {
  const typeAttr = def.node.attributes.find((a) => a.name === 'type');
  return {
    id: def.id,
    type: typeAttr?.value,
    uri: def.uri,
    range: def.range,
  };
}
