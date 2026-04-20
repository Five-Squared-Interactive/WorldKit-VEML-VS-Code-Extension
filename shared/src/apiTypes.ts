/**
 * Public API types for WorldKit VEML extension.
 * Third-party extensions consume these types to interact with VEML worlds.
 *
 * @example
 * ```typescript
 * import type { VemlWorldApi } from 'worldkit-vscode';
 *
 * const ext = vscode.extensions.getExtension('fivesquared.worldkit-vscode');
 * const api = ext?.exports as VemlWorldApi | undefined;
 * if (api) {
 *   const entities = await api.queryEntities();
 *   console.log(`Found ${entities.length} entities`);
 * }
 * ```
 */

import type { SourceRange } from './ast.types.js';
import type { SceneNode } from './sceneTypes.js';

/**
 * Serializable representation of a VEML entity.
 * Unlike the internal `VemlNode`, this type has no circular references
 * and is safe to serialize across process boundaries.
 */
export interface EntityInfo {
  /** Entity ID from the `id` attribute. */
  readonly id: string;
  /** Entity type from the `type` attribute, or `undefined` if not set. */
  readonly type: string | undefined;
  /** Document URI where this entity is defined. */
  readonly uri: string;
  /** Source range of the entity's `id` attribute value (not the full element). */
  readonly range: SourceRange;
}

/**
 * Optional filter criteria for `queryEntities()`.
 * All filter fields use AND logic — an entity must match all specified criteria.
 */
export interface EntityQueryFilter {
  /** Match entities whose `type` attribute equals this value. */
  readonly type?: string;
  /** Match entities whose `id` starts with this prefix. */
  readonly idPrefix?: string;
}

/**
 * Describes a change to the VEML world.
 * Emitted via `onDidChangeWorld` when VEML files are added, changed, or removed.
 */
export interface WorldChangeEvent {
  /** URI of the VEML document that changed. */
  readonly uri: string;
  /** Type of change that occurred. */
  readonly changeType: 'added' | 'changed' | 'removed';
}

/**
 * Public API interface for third-party extensions to query and interact with VEML worlds.
 * Access via `vscode.extensions.getExtension('fivesquared.worldkit-vscode')?.exports`.
 *
 * All methods return empty/undefined results gracefully when the language server
 * is not running. No method throws — check return values instead.
 *
 * API stability: 0.x — interface may change before 1.0 release.
 *
 * @example
 * ```typescript
 * const ext = vscode.extensions.getExtension('fivesquared.worldkit-vscode');
 * const api = ext?.exports as VemlWorldApi | undefined;
 * if (api) {
 *   // Query all entities
 *   const all = await api.queryEntities();
 *
 *   // Filter by type
 *   const dynamic = await api.queryEntities({ type: 'dynamic' });
 *
 *   // Resolve a specific entity
 *   const player = await api.resolveReference('player-spawn');
 *
 *   // Get scene hierarchy
 *   const tree = await api.getSceneHierarchy('file:///path/to/world.veml');
 *
 *   // Subscribe to changes
 *   const disposable = api.onDidChangeWorld((event) => {
 *     console.log(`${event.changeType}: ${event.uri}`);
 *   });
 * }
 * ```
 */
export interface VemlWorldApi {
  /**
   * API version string (semver). Currently `'0.1.0'`.
   *
   * @example
   * ```typescript
   * console.log(`WorldKit API version: ${api.version}`);
   * ```
   */
  readonly version: string;

  /**
   * Query indexed entities across the workspace.
   * Returns all entities matching the optional filter criteria.
   *
   * @param filter - Optional filter criteria. If omitted, returns all entities.
   * @returns Array of matching entities. Empty array if no matches or server unavailable.
   *
   * @example
   * ```typescript
   * const allEntities = await api.queryEntities();
   * const staticEntities = await api.queryEntities({ type: 'static' });
   * const players = await api.queryEntities({ idPrefix: 'player' });
   * ```
   */
  queryEntities(filter?: EntityQueryFilter): Promise<ReadonlyArray<EntityInfo>>;

  /**
   * Resolve an entity reference by ID.
   * Looks up the entity definition across all indexed VEML files.
   *
   * @param entityId - The entity ID to resolve (value of the `id` attribute).
   * @returns The entity info if found, or `undefined` if not found or server unavailable.
   *
   * @example
   * ```typescript
   * const spawn = await api.resolveReference('player-spawn');
   * if (spawn) {
   *   console.log(`Found at ${spawn.uri}, line ${spawn.range.start.line}`);
   * }
   * ```
   */
  resolveReference(entityId: string): Promise<EntityInfo | undefined>;

  /**
   * Get the scene hierarchy for a specific VEML document.
   * Returns the entity tree structure parsed from the document.
   *
   * @param uri - Document URI (e.g., `'file:///path/to/world.veml'`).
   * @returns Array of root-level scene nodes. Empty array if document not found or server unavailable.
   *
   * @example
   * ```typescript
   * const tree = await api.getSceneHierarchy('file:///my-world/world.veml');
   * for (const node of tree) {
   *   console.log(`${node.label} (${node.type}): ${node.children.length} children`);
   * }
   * ```
   */
  getSceneHierarchy(uri: string): Promise<ReadonlyArray<SceneNode>>;

  /**
   * Event fired when VEML world content changes.
   * Subscribe to receive notifications when VEML files are added, changed, or removed.
   * Returns a `Disposable` — call `.dispose()` to unsubscribe.
   *
   * @example
   * ```typescript
   * const disposable = api.onDidChangeWorld((event) => {
   *   console.log(`World ${event.changeType}: ${event.uri}`);
   *   // Re-query entities after change
   *   const updated = await api.queryEntities();
   * });
   *
   * // Later: clean up
   * disposable.dispose();
   * ```
   */
  onDidChangeWorld: (listener: (event: WorldChangeEvent) => void) => { dispose(): void };
}
