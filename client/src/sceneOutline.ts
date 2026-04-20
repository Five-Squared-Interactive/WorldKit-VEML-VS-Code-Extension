import type { SceneNode } from '../../shared/src/sceneTypes.js';
import type { SourceRange } from '../../shared/src/ast.types.js';

/**
 * Sentinel nodeKind value for informational/error message nodes.
 */
export const MESSAGE_NODE_KIND = '__message__';

/**
 * Collapsible state constants matching VS Code TreeItemCollapsibleState.
 * Avoids importing vscode in test-only paths.
 */
const CollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
} as const;

/**
 * Map a SceneNode's nodeKind to a VS Code ThemeIcon identifier.
 */
export function getIconForKind(nodeKind: string): string {
  switch (nodeKind) {
    case 'World': return 'globe';
    case 'Entities': return 'symbol-folder';
    case 'Entity': return 'symbol-class';
    case 'Environment': return 'cloud';
    case 'Sky':
    case 'Terrain': return 'symbol-property';
    case 'Mesh':
    case 'Light':
    case 'Camera':
    case 'Audio':
    case 'Transform':
    case 'Material':
    case 'Physics':
    case 'Collider':
    case 'Animation': return 'symbol-field';
    case 'Behavior':
    case 'Script': return 'symbol-event';
    case 'Canvas':
    case 'Panel':
    case 'Button':
    case 'Text':
    case 'Input': return 'symbol-interface';
    default: return 'symbol-misc';
  }
}

/**
 * A 0-based selection range for VS Code editor navigation.
 * VS Code uses 0-based lines; SourceRange uses 1-based lines.
 */
export interface SelectionRange {
  startLine: number;
  startCharacter: number;
  endLine: number;
  endCharacter: number;
}

/**
 * Convert a SourceRange (1-based lines) to a 0-based SelectionRange for VS Code.
 */
export function sourceRangeToSelection(range: SourceRange): SelectionRange {
  return {
    startLine: range.start.line - 1,
    startCharacter: range.start.column,
    endLine: range.end.line - 1,
    endCharacter: range.end.column,
  };
}

/**
 * Typed argument for click-to-navigate commands.
 * Shared between createTreeItem and SceneOutlineProvider to enforce the contract.
 */
export interface CommandSelectionArg {
  selection: SelectionRange;
}

/**
 * Plain command descriptor — no vscode import needed.
 */
export interface TreeItemCommand {
  command: string;
  title: string;
  arguments?: [CommandSelectionArg];
}

/**
 * A plain TreeItem-like object that can be created without importing vscode.
 * The SceneOutlineProvider wraps this with a real vscode.TreeItem.
 */
export interface SceneTreeItem {
  label: string;
  description: string;
  collapsibleState: number;
  contextValue: string;
  iconId: string;
  accessibilityInformation: { label: string; role: string };
  command?: TreeItemCommand;
}

/**
 * Create a tree item description from a SceneNode.
 * Pure function — no VS Code API dependency.
 * When docUri is provided and the node is not a message node, includes a click-to-navigate command.
 */
export function createTreeItem(node: SceneNode, docUri?: string): SceneTreeItem {
  const hasChildren = node.children.length > 0;
  const item: SceneTreeItem = {
    label: node.label,
    description: node.type !== node.label ? node.type : '',
    collapsibleState: hasChildren ? CollapsibleState.Expanded : CollapsibleState.None,
    contextValue: node.nodeKind,
    iconId: getIconForKind(node.nodeKind),
    accessibilityInformation: {
      label: `${node.label} ${node.nodeKind}`,
      role: 'treeitem',
    },
  };

  // Add click-to-navigate command for non-message nodes when URI is available
  if (docUri && node.nodeKind !== MESSAGE_NODE_KIND) {
    item.command = {
      command: 'vscode.open',
      title: 'Go to Definition',
      arguments: [{ selection: sourceRangeToSelection(node.range) }],
    };
  }

  return item;
}

/**
 * Create a message SceneNode for informational or error display.
 */
export function createMessageNode(message: string): SceneNode {
  return {
    label: message,
    type: '',
    path: '',
    range: { start: { line: 1, column: 0, offset: 0 }, end: { line: 1, column: 0, offset: 0 } },
    children: [],
    nodeKind: MESSAGE_NODE_KIND,
  };
}
