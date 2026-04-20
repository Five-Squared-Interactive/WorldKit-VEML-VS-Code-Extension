/**
 * Shared package barrel export.
 * This is the only barrel file allowed — no barrel files inside subdirectories.
 */
export {
  EXTENSION_ID,
  EXTENSION_DISPLAY_NAME,
  VEML_LANGUAGE_ID,
  VEML_FILE_EXTENSION,
  PROJECT_MARKER_FILE,
  OUTPUT_CHANNEL_NAME,
  Commands,
  Views,
  ContextKeys,
  LspNotifications,
  LspRequests,
} from './constants.js';

export { NodeKind, ENTITY_NODE_KINDS, tagNameToKind } from './nodeKind.js';

export type {
  SourcePosition,
  SourceRange,
  VemlAttribute,
  VemlNode,
  ErrorNode,
  VemlDocument,
  MutableVemlNode,
  MutableErrorNode,
} from './ast.types.js';

export {
  isErrorNode,
  isVemlNode,
  isEntityNode,
  isEnvironmentNode,
  isMetadataNode,
  isDocumentNode,
  isUnknownNode,
  visitNode,
  findNodes,
  buildNodePath,
  deepFreeze,
} from './nodeUtils.js';
export type { VemlVisitor } from './nodeUtils.js';

export {
  ALL_DIAGNOSTIC_CODES,
  getDiagnosticCode,
} from './diagnosticCodes.js';
export type { DiagnosticCode, DiagnosticSeverity } from './diagnosticCodes.js';

export {
  createDiagnostic,
  toLspDiagnostic,
} from './diagnostics.js';
export type { VemlDiagnostic } from './diagnostics.js';

export {
  getElementSchema,
  VALID_ELEMENT_NAMES,
  ELEMENT_SCHEMAS,
  ENTITY_TYPE_ELEMENT_NAMES,
} from './vemlSchema.js';
export type { VemlElementSchema, VemlOptionalAttribute } from './vemlSchema.js';

export type { SceneNode } from './sceneTypes.js';

export type { ValidateAllResult } from './validateAllTypes.js';

export type {
  EntityInfo,
  EntityQueryFilter,
  WorldChangeEvent,
  VemlWorldApi,
} from './apiTypes.js';

export { Tier, TIER_LABELS } from './tier.types.js';
export type { TierCapability } from './tier.types.js';
