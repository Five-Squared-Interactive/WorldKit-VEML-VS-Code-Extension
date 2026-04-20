import type { SourceRange } from './ast.types.js';

/**
 * A node in the scene hierarchy, serializable across the LSP boundary.
 * Derived from the VEML AST but contains no back-references or non-serializable data.
 */
export interface SceneNode {
  /** Display label — entity id attribute or fallback like `<entity>[0]`. */
  readonly label: string;
  /** Entity type attribute value or tag name. */
  readonly type: string;
  /** AST node path for identity (e.g., "/world/entities/entity[0]"). */
  readonly path: string;
  /** Source range for click-to-navigate (Story 3.2). */
  readonly range: SourceRange;
  /** Child nodes in the hierarchy. */
  readonly children: SceneNode[];
  /** Node kind string for icon selection (e.g., "Entity", "World", "Environment"). */
  readonly nodeKind: string;
  /** True if this branch was terminated due to circular reference. */
  readonly circular?: boolean;
}
