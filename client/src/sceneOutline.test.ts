import { describe, it, expect } from 'vitest';
import { createTreeItem, getIconForKind, createMessageNode, MESSAGE_NODE_KIND, sourceRangeToSelection } from './sceneOutline.js';
import type { SceneNode } from '../../shared/src/sceneTypes.js';

function makeNode(overrides: Partial<SceneNode> = {}): SceneNode {
  return {
    label: 'test-entity',
    type: 'entity',
    path: '/world/entities/entity',
    range: {
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 1, column: 30, offset: 30 },
    },
    children: [],
    nodeKind: 'Entity',
    ...overrides,
  };
}

describe('createTreeItem', () => {
  it('creates TreeItem with correct label and description', () => {
    const node = makeNode({ label: 'player', type: 'dynamic' });
    const item = createTreeItem(node);
    expect(item.label).toBe('player');
    expect(item.description).toBe('dynamic');
  });

  it('sets collapsibleState to Expanded when node has children', () => {
    const child = makeNode({ label: 'child' });
    const node = makeNode({ label: 'parent', children: [child] });
    const item = createTreeItem(node);
    // 2 = TreeItemCollapsibleState.Expanded
    expect(item.collapsibleState).toBe(2);
  });

  it('sets collapsibleState to None when node has no children', () => {
    const node = makeNode({ label: 'leaf', children: [] });
    const item = createTreeItem(node);
    // 0 = TreeItemCollapsibleState.None
    expect(item.collapsibleState).toBe(0);
  });

  it('uses fallback label for entity without id', () => {
    const node = makeNode({ label: '<entity>[0]' });
    const item = createTreeItem(node);
    expect(item.label).toBe('<entity>[0]');
  });

  it('sets contextValue to nodeKind', () => {
    const node = makeNode({ nodeKind: 'Entity' });
    const item = createTreeItem(node);
    expect(item.contextValue).toBe('Entity');
  });

  it('sets description to empty string when type equals label', () => {
    const node = makeNode({ label: 'world', type: 'world' });
    const item = createTreeItem(node);
    expect(item.description).toBe('');
  });

  it('sets accessibility information', () => {
    const node = makeNode({ label: 'player', nodeKind: 'Entity' });
    const item = createTreeItem(node);
    expect(item.accessibilityInformation).toEqual({
      label: 'player Entity',
      role: 'treeitem',
    });
  });
});

describe('getIconForKind', () => {
  it('returns globe for World', () => {
    expect(getIconForKind('World')).toBe('globe');
  });

  it('returns symbol-folder for Entities', () => {
    expect(getIconForKind('Entities')).toBe('symbol-folder');
  });

  it('returns symbol-class for Entity', () => {
    expect(getIconForKind('Entity')).toBe('symbol-class');
  });

  it('returns cloud for Environment', () => {
    expect(getIconForKind('Environment')).toBe('cloud');
  });

  it('returns symbol-event for Behavior', () => {
    expect(getIconForKind('Behavior')).toBe('symbol-event');
  });

  it('returns symbol-event for Script', () => {
    expect(getIconForKind('Script')).toBe('symbol-event');
  });

  it('returns symbol-field for Mesh', () => {
    expect(getIconForKind('Mesh')).toBe('symbol-field');
  });

  it('returns symbol-misc for unknown kinds', () => {
    expect(getIconForKind('SomethingElse')).toBe('symbol-misc');
  });
});

describe('createMessageNode', () => {
  it('creates a node with the given message as label', () => {
    const node = createMessageNode('Open a VEML file to see scene outline');
    expect(node.label).toBe('Open a VEML file to see scene outline');
  });

  it('sets nodeKind to MESSAGE_NODE_KIND sentinel', () => {
    const node = createMessageNode('test message');
    expect(node.nodeKind).toBe(MESSAGE_NODE_KIND);
  });

  it('has empty children array', () => {
    const node = createMessageNode('test');
    expect(node.children).toEqual([]);
  });

  it('has empty type and path', () => {
    const node = createMessageNode('error');
    expect(node.type).toBe('');
    expect(node.path).toBe('');
  });

  it('has valid range with default positions', () => {
    const node = createMessageNode('msg');
    expect(node.range.start.line).toBe(1);
    expect(node.range.start.column).toBe(0);
    expect(node.range.end.line).toBe(1);
    expect(node.range.end.column).toBe(0);
  });
});

describe('sourceRangeToSelection', () => {
  it('converts 1-based line to 0-based', () => {
    const range = { start: { line: 5, column: 3, offset: 50 }, end: { line: 5, column: 20, offset: 67 } };
    const sel = sourceRangeToSelection(range);
    expect(sel.startLine).toBe(4);
    expect(sel.startCharacter).toBe(3);
    expect(sel.endLine).toBe(4);
    expect(sel.endCharacter).toBe(20);
  });

  it('handles line 1 correctly (becomes 0)', () => {
    const range = { start: { line: 1, column: 0, offset: 0 }, end: { line: 1, column: 10, offset: 10 } };
    const sel = sourceRangeToSelection(range);
    expect(sel.startLine).toBe(0);
    expect(sel.endLine).toBe(0);
  });

  it('handles multi-line range', () => {
    const range = { start: { line: 3, column: 2, offset: 30 }, end: { line: 7, column: 15, offset: 100 } };
    const sel = sourceRangeToSelection(range);
    expect(sel.startLine).toBe(2);
    expect(sel.startCharacter).toBe(2);
    expect(sel.endLine).toBe(6);
    expect(sel.endCharacter).toBe(15);
  });
});

describe('createTreeItem with document URI', () => {
  const docUri = 'file:///workspace/world.veml';

  it('includes command with vscode.open for normal nodes', () => {
    const node = makeNode({
      label: 'player',
      range: { start: { line: 5, column: 0, offset: 40 }, end: { line: 5, column: 30, offset: 70 } },
    });
    const item = createTreeItem(node, docUri);
    expect(item.command).toBeDefined();
    expect(item.command!.command).toBe('vscode.open');
    expect(item.command!.arguments).toHaveLength(1);
    // Selection should have 0-based lines
    expect(item.command!.arguments![0]).toEqual({
      selection: { startLine: 4, startCharacter: 0, endLine: 4, endCharacter: 30 },
    });
  });

  it('does not include command for message nodes without URI', () => {
    const msgNode = createMessageNode('No scene elements');
    const item = createTreeItem(msgNode);
    expect(item.command).toBeUndefined();
  });

  it('does not include command for message nodes even when URI is provided', () => {
    const msgNode = createMessageNode('No scene elements');
    const item = createTreeItem(msgNode, docUri);
    expect(item.command).toBeUndefined();
  });

  it('does not include command when no URI provided', () => {
    const node = makeNode({ label: 'test' });
    const item = createTreeItem(node);
    expect(item.command).toBeUndefined();
  });
});
