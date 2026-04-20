/**
 * Extension-wide constants shared between client and server.
 */

/** Extension identifier used in VS Code contribution points. */
export const EXTENSION_ID = 'worldkit-vscode';

/** Display name shown in UI elements. */
export const EXTENSION_DISPLAY_NAME = 'WorldKit VEML';

/** VEML language identifier registered with VS Code. */
export const VEML_LANGUAGE_ID = 'veml';

/** VEML file extension. */
export const VEML_FILE_EXTENSION = '.veml';

/** Project marker file name. */
export const PROJECT_MARKER_FILE = '.vemlproject';

/** Output channel name for extension logging. */
export const OUTPUT_CHANNEL_NAME = 'WorldKit VEML';

/**
 * VS Code command identifiers.
 * Format: worldkit-vscode.commandName
 */
export const Commands = {
  validateAll: `${EXTENSION_ID}.validateAll`,
  showSceneOutline: `${EXTENSION_ID}.showSceneOutline`,
  newWorldProject: `${EXTENSION_ID}.newWorldProject`,
} as const;

/**
 * VS Code view identifiers.
 * Format: worldkit-vscode.viewName
 */
export const Views = {
  sceneOutline: `${EXTENSION_ID}.sceneOutline`,
} as const;

/**
 * VS Code context key identifiers.
 * Format: worldkit-vscode:contextKey (colon separator)
 */
export const ContextKeys = {
  hasVemlFiles: `${EXTENSION_ID}:hasVemlFiles`,
  tierLevel: `${EXTENSION_ID}:tierLevel`,
  projectDetected: `${EXTENSION_ID}:projectDetected`,
} as const;

/**
 * LSP custom notification names.
 * Format: worldkit/notificationName
 */
export const LspNotifications = {
  projectIndexReady: 'worldkit/projectIndexReady',
  sceneDidChange: 'worldkit/sceneDidChange',
  tierChanged: 'worldkit/tierChanged',
} as const;

/**
 * LSP custom request names.
 * Format: worldkit/requestName
 */
export const LspRequests = {
  getSceneHierarchy: 'worldkit/getSceneHierarchy',
  resolveEntityReference: 'worldkit/resolveEntityReference',
  validateAll: 'worldkit/validateAll',
  queryEntities: 'worldkit/queryEntities',
} as const;
