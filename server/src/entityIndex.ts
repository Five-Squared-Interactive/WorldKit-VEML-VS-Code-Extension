/**
 * Entity ID index for cross-file go-to-definition and find-all-references.
 * Maintains maps of entity definitions (id="...") and references (ref="...").
 */

import type { VemlDocument, VemlNode, SourceRange } from '../../shared/src/index.js';
import { visitNode, isEntityNode } from '../../shared/src/index.js';

export interface EntityDefinition {
  readonly id: string;
  readonly uri: string;
  readonly range: SourceRange;
  readonly node: VemlNode;
}

export interface EntityReference {
  readonly id: string;
  readonly uri: string;
  readonly range: SourceRange;
  readonly attributeName: string;
}

/**
 * Cross-file entity index.
 * Tracks entity `id` definitions and `ref` references across all indexed documents.
 */
export class EntityIndex {
  /** id → all definition locations (last element wins for duplicate IDs) */
  private definitions = new Map<string, EntityDefinition[]>();
  /** id → reference locations */
  private references = new Map<string, EntityReference[]>();
  /** uri → set of definition IDs from that document */
  private uriDefinitions = new Map<string, Set<string>>();
  /** uri → list of references from that document */
  private uriReferences = new Map<string, EntityReference[]>();

  /**
   * Index all entity definitions and references in a document.
   */
  indexDocument(uri: string, doc: VemlDocument): void {
    // Ensure idempotency — remove stale data before re-indexing (Finding 2)
    this.removeDocument(uri);

    if (!doc.root) return;

    const defs = new Set<string>();
    const refs: EntityReference[] = [];

    visitNode(doc.root, {
      enter: (node) => {
        for (const attr of node.attributes) {
          // Only index id attributes on entity elements (Finding 3)
          if (attr.name === 'id' && attr.value && isEntityNode(node)) {
            const def: EntityDefinition = {
              id: attr.value,
              uri,
              range: attr.valueRange,
              node,
            };
            const existing = this.definitions.get(attr.value);
            if (existing) {
              existing.push(def);
            } else {
              this.definitions.set(attr.value, [def]);
            }
            defs.add(attr.value);
          }

          if (attr.name === 'ref' && attr.value) {
            const ref: EntityReference = {
              id: attr.value,
              uri,
              range: attr.valueRange,
              attributeName: attr.name,
            };
            refs.push(ref);

            const existing = this.references.get(attr.value);
            if (existing) {
              existing.push(ref);
            } else {
              this.references.set(attr.value, [ref]);
            }
          }
        }
      },
    });

    this.uriDefinitions.set(uri, defs);
    this.uriReferences.set(uri, refs);
  }

  /**
   * Remove all definitions and references from a specific document.
   */
  removeDocument(uri: string): void {
    // Remove definitions — filter out this URI, keep surviving definitions (Finding 1)
    const defs = this.uriDefinitions.get(uri);
    if (defs) {
      for (const id of defs) {
        const allDefs = this.definitions.get(id);
        if (allDefs) {
          const filtered = allDefs.filter((d) => d.uri !== uri);
          if (filtered.length === 0) {
            this.definitions.delete(id);
          } else {
            this.definitions.set(id, filtered);
          }
        }
      }
      this.uriDefinitions.delete(uri);
    }

    // Remove references
    const refs = this.uriReferences.get(uri);
    if (refs) {
      for (const ref of refs) {
        const allRefs = this.references.get(ref.id);
        if (allRefs) {
          const filtered = allRefs.filter((r) => r.uri !== uri);
          if (filtered.length === 0) {
            this.references.delete(ref.id);
          } else {
            this.references.set(ref.id, filtered);
          }
        }
      }
      this.uriReferences.delete(uri);
    }
  }

  /**
   * Get the definition location for an entity ID. O(1).
   */
  getDefinition(id: string): EntityDefinition | undefined {
    const defs = this.definitions.get(id);
    return defs && defs.length > 0 ? defs[defs.length - 1] : undefined;
  }

  /**
   * Get all reference locations for an entity ID. O(1).
   */
  getReferences(id: string): readonly EntityReference[] {
    return [...(this.references.get(id) ?? [])];
  }

  /**
   * Get all entity definitions across all indexed documents.
   * Returns the winning definition for each unique ID (last indexed wins).
   */
  getAllDefinitions(): readonly EntityDefinition[] {
    const result: EntityDefinition[] = [];
    for (const defs of this.definitions.values()) {
      if (defs.length > 0) {
        result.push(defs[defs.length - 1]);
      }
    }
    return result;
  }

  /**
   * Total number of indexed definitions.
   */
  getDefinitionCount(): number {
    let count = 0;
    for (const defs of this.definitions.values()) {
      count += defs.length;
    }
    return count;
  }

  /**
   * Total number of indexed references.
   */
  getReferenceCount(): number {
    let count = 0;
    for (const refs of this.references.values()) {
      count += refs.length;
    }
    return count;
  }
}
