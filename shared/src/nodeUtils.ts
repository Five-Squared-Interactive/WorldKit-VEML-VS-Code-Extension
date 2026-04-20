import { NodeKind, ENTITY_NODE_KINDS } from './nodeKind.js';
import type { VemlNode, ErrorNode, MutableVemlNode } from './ast.types.js';

// ── Type Guards ──────────────────────────────────────────────────────

export function isErrorNode(node: VemlNode): node is ErrorNode {
  return node.kind === NodeKind.Error;
}

export function isVemlNode(node: VemlNode): node is VemlNode & { kind: NodeKind.Veml } {
  return node.kind === NodeKind.Veml;
}

export function isEntityNode(node: VemlNode): boolean {
  return ENTITY_NODE_KINDS.has(node.kind);
}

export function isEnvironmentNode(node: VemlNode): node is VemlNode & { kind: NodeKind.Environment } {
  return node.kind === NodeKind.Environment;
}

export function isMetadataNode(node: VemlNode): node is VemlNode & { kind: NodeKind.Metadata } {
  return node.kind === NodeKind.Metadata;
}

export function isDocumentNode(node: VemlNode): node is VemlNode & { kind: NodeKind.Document } {
  return node.kind === NodeKind.Document;
}

export function isUnknownNode(node: VemlNode): node is VemlNode & { kind: NodeKind.Unknown } {
  return node.kind === NodeKind.Unknown;
}

// ── Visitor Pattern ──────────────────────────────────────────────────

export interface VemlVisitor {
  enter?(node: VemlNode): void | boolean;
  leave?(node: VemlNode): void;
}

/**
 * Walk the AST depth-first. If `enter` returns `false`, children are skipped.
 */
export function visitNode(node: VemlNode, visitor: VemlVisitor): void {
  const skipChildren = visitor.enter?.(node);
  if (skipChildren !== false) {
    for (const child of node.children) {
      visitNode(child, visitor);
    }
  }
  visitor.leave?.(node);
}

/**
 * Collect all nodes matching a predicate via depth-first traversal.
 */
export function findNodes(root: VemlNode, predicate: (node: VemlNode) => boolean): VemlNode[] {
  const results: VemlNode[] = [];
  visitNode(root, {
    enter(node) {
      if (predicate(node)) results.push(node);
    },
  });
  return results;
}

// ── Path Builder ─────────────────────────────────────────────────────

/**
 * Build a node path for a child being added to a parent.
 * Uses index disambiguation when siblings share the same tag name.
 */
export function buildNodePath(
  parentPath: string,
  tagName: string,
  siblingIndex: number,
  siblingCount: number,
): string {
  const base = parentPath === '/' ? `/${tagName}` : `${parentPath}/${tagName}`;
  return siblingCount > 1 ? `${base}[${siblingIndex}]` : base;
}

// ── Deep Freeze ──────────────────────────────────────────────────────

/**
 * Recursively freeze a mutable AST node tree, converting it to an immutable VemlNode tree.
 * The `parent` back-reference is preserved but not enumerable to avoid circular freeze.
 */
export function deepFreeze(node: MutableVemlNode): VemlNode {
  // Make parent non-enumerable to avoid circular reference issues during serialization
  Object.defineProperty(node, 'parent', {
    value: node.parent,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  Object.freeze(node.range);
  Object.freeze(node.range.start);
  Object.freeze(node.range.end);
  for (const attr of node.attributes) {
    Object.freeze(attr);
    Object.freeze(attr.nameRange);
    Object.freeze(attr.nameRange.start);
    Object.freeze(attr.nameRange.end);
    Object.freeze(attr.valueRange);
    Object.freeze(attr.valueRange.start);
    Object.freeze(attr.valueRange.end);
  }
  Object.freeze(node.attributes);
  for (const child of node.children) {
    deepFreeze(child);
  }
  Object.freeze(node.children);
  Object.freeze(node);
  return node as unknown as VemlNode;
}
