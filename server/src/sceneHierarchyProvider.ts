import type { VemlDocument, VemlNode } from '../../shared/src/ast.types.js';
import type { SceneNode } from '../../shared/src/sceneTypes.js';
import { NodeKind, ENTITY_NODE_KINDS } from '../../shared/src/nodeKind.js';
import { isErrorNode } from '../../shared/src/nodeUtils.js';

/**
 * Build a scene hierarchy from a parsed VEML document.
 * Returns an array of top-level SceneNode items (typically a single World node).
 * ErrorNodes are omitted. Circular references are detected via visited-path set.
 *
 * The parser wraps all content in a Document root node — this function unwraps it
 * and returns the meaningful children (e.g., World) as top-level items.
 */
export function getSceneHierarchy(doc: VemlDocument): SceneNode[] {
  if (!doc.root) return [];

  const visited = new Set<string>();

  // Unwrap the Document root node — return its children as top-level hierarchy
  if (doc.root.kind === NodeKind.Document) {
    return buildChildren(doc.root.children, visited);
  }

  // Non-Document root (shouldn't normally happen, but handle defensively)
  return [buildSceneNode(doc.root, 0, visited)];
}

function buildSceneNode(
  node: VemlNode,
  siblingIndex: number,
  visited: Set<string>,
): SceneNode {
  // Circular reference guard
  if (visited.has(node.path)) {
    return {
      label: getLabel(node, siblingIndex) + ' (circular)',
      type: getType(node),
      path: node.path,
      range: node.range,
      children: [],
      nodeKind: node.kind,
      circular: true,
    };
  }

  visited.add(node.path);

  const children = buildChildren(node.children, visited);

  return {
    label: getLabel(node, siblingIndex),
    type: getType(node),
    path: node.path,
    range: node.range,
    children,
    nodeKind: node.kind,
  };
}

function buildChildren(
  children: readonly VemlNode[],
  visited: Set<string>,
): SceneNode[] {
  const result: SceneNode[] = [];
  // Track sibling indices per tag name for fallback labels
  const tagCounts = new Map<string, number>();

  for (const child of children) {
    if (isErrorNode(child)) continue;
    // Skip Document-level wrapper nodes and structural non-element nodes
    if (child.kind === NodeKind.Comment || child.kind === NodeKind.CData || child.kind === NodeKind.ProcessingInstruction) {
      continue;
    }

    const count = tagCounts.get(child.tagName) ?? 0;
    tagCounts.set(child.tagName, count + 1);
  }

  const tagIndices = new Map<string, number>();
  for (const child of children) {
    if (isErrorNode(child)) continue;
    if (child.kind === NodeKind.Comment || child.kind === NodeKind.CData || child.kind === NodeKind.ProcessingInstruction) {
      continue;
    }

    const idx = tagIndices.get(child.tagName) ?? 0;
    tagIndices.set(child.tagName, idx + 1);
    result.push(buildSceneNode(child, idx, visited));
  }

  return result;
}

function getLabel(node: VemlNode, siblingIndex: number): string {
  // Use id attribute if present
  const idAttr = node.attributes.find((a) => a.name === 'id');
  if (idAttr && idAttr.value) return idAttr.value;

  // For nodes that typically have ids (entities), use fallback with index
  if (ENTITY_NODE_KINDS.has(node.kind)) {
    return `<${node.tagName}>[${siblingIndex}]`;
  }

  // For structural nodes (world, entities, environment, etc.), use tag name
  return node.tagName;
}

function getType(node: VemlNode): string {
  const typeAttr = node.attributes.find((a) => a.name === 'type');
  if (typeAttr && typeAttr.value) return typeAttr.value;
  return node.tagName;
}
