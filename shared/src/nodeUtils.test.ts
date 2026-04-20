import { describe, it, expect } from 'vitest';
import { NodeKind } from './nodeKind.js';
import type { VemlNode, ErrorNode, MutableVemlNode } from './ast.types.js';
import {
  isErrorNode,
  isVemlNode,
  isEntityNode,
  isMetadataNode,
  isEnvironmentNode,
  isDocumentNode,
  isUnknownNode,
  visitNode,
  findNodes,
  buildNodePath,
  deepFreeze,
} from './nodeUtils.js';

const ZERO_POS = { line: 1, column: 0, offset: 0 };
const ZERO_RANGE = { start: ZERO_POS, end: ZERO_POS };

function makeNode(kind: NodeKind, tagName = '', children: VemlNode[] = []): VemlNode {
  return {
    kind,
    path: `/${tagName}`,
    range: ZERO_RANGE,
    attributes: [],
    children,
    parent: undefined,
    tagName,
  };
}

function makeErrorNode(): ErrorNode {
  return {
    kind: NodeKind.Error,
    path: '/error',
    range: ZERO_RANGE,
    attributes: [],
    children: [],
    parent: undefined,
    tagName: '',
    rawText: '<bad>',
    errorMessage: 'Parse error',
  };
}

describe('Type Guards', () => {
  it('isErrorNode identifies error nodes', () => {
    expect(isErrorNode(makeErrorNode())).toBe(true);
    expect(isErrorNode(makeNode(NodeKind.Veml, 'veml'))).toBe(false);
  });

  it('isVemlNode identifies veml root nodes', () => {
    expect(isVemlNode(makeNode(NodeKind.Veml, 'veml'))).toBe(true);
    expect(isVemlNode(makeNode(NodeKind.Mesh, 'mesh'))).toBe(false);
  });

  it('isEntityNode identifies entity-type nodes', () => {
    expect(isEntityNode(makeNode(NodeKind.Mesh, 'mesh'))).toBe(true);
    expect(isEntityNode(makeNode(NodeKind.Character, 'character'))).toBe(true);
    expect(isEntityNode(makeNode(NodeKind.Light, 'light'))).toBe(true);
    expect(isEntityNode(makeNode(NodeKind.Container, 'container'))).toBe(true);
    expect(isEntityNode(makeNode(NodeKind.Veml, 'veml'))).toBe(false);
  });

  it('isMetadataNode identifies metadata nodes', () => {
    expect(isMetadataNode(makeNode(NodeKind.Metadata, 'metadata'))).toBe(true);
    expect(isMetadataNode(makeNode(NodeKind.Veml, 'veml'))).toBe(false);
  });

  it('isEnvironmentNode identifies environment nodes', () => {
    expect(isEnvironmentNode(makeNode(NodeKind.Environment, 'environment'))).toBe(true);
    expect(isEnvironmentNode(makeNode(NodeKind.Veml, 'veml'))).toBe(false);
  });

  it('isDocumentNode identifies document nodes', () => {
    expect(isDocumentNode(makeNode(NodeKind.Document, ''))).toBe(true);
    expect(isDocumentNode(makeNode(NodeKind.Veml, 'veml'))).toBe(false);
  });

  it('isUnknownNode identifies unknown nodes', () => {
    expect(isUnknownNode(makeNode(NodeKind.Unknown, 'foobar'))).toBe(true);
    expect(isUnknownNode(makeNode(NodeKind.Mesh, 'mesh'))).toBe(false);
  });
});

describe('visitNode', () => {
  const tree = makeNode(NodeKind.Veml, 'veml', [
    makeNode(NodeKind.Metadata, 'metadata'),
    makeNode(NodeKind.Environment, 'environment', [
      makeNode(NodeKind.Mesh, 'mesh'),
      makeNode(NodeKind.Mesh, 'mesh'),
    ]),
  ]);

  it('visits all nodes depth-first', () => {
    const visited: NodeKind[] = [];
    visitNode(tree, { enter(node) { visited.push(node.kind); } });
    expect(visited).toEqual([
      NodeKind.Veml,
      NodeKind.Metadata,
      NodeKind.Environment,
      NodeKind.Mesh,
      NodeKind.Mesh,
    ]);
  });

  it('calls leave in post-order', () => {
    const left: string[] = [];
    visitNode(tree, { leave(node) { left.push(node.tagName); } });
    expect(left).toEqual(['metadata', 'mesh', 'mesh', 'environment', 'veml']);
  });

  it('skips children when enter returns false', () => {
    const visited: NodeKind[] = [];
    visitNode(tree, {
      enter(node) {
        visited.push(node.kind);
        if (node.kind === NodeKind.Environment) return false;
      },
    });
    expect(visited).toEqual([NodeKind.Veml, NodeKind.Metadata, NodeKind.Environment]);
  });
});

describe('findNodes', () => {
  const tree = makeNode(NodeKind.Veml, 'veml', [
    makeNode(NodeKind.Mesh, 'mesh'),
    makeNode(NodeKind.Environment, 'environment', [
      makeNode(NodeKind.Mesh, 'mesh'),
    ]),
  ]);

  it('finds all matching nodes', () => {
    const meshes = findNodes(tree, (n) => n.kind === NodeKind.Mesh);
    expect(meshes).toHaveLength(2);
  });

  it('returns empty array when none match', () => {
    const lights = findNodes(tree, (n) => n.kind === NodeKind.Light);
    expect(lights).toHaveLength(0);
  });
});

describe('buildNodePath', () => {
  it('builds root-level paths', () => {
    expect(buildNodePath('/', 'veml', 0, 1)).toBe('/veml');
  });

  it('builds nested paths', () => {
    expect(buildNodePath('/veml', 'environment', 0, 1)).toBe('/veml/environment');
  });

  it('adds index when siblings share tag name', () => {
    expect(buildNodePath('/veml/environment', 'mesh', 0, 3)).toBe('/veml/environment/mesh[0]');
    expect(buildNodePath('/veml/environment', 'mesh', 2, 3)).toBe('/veml/environment/mesh[2]');
  });

  it('omits index when sibling is unique', () => {
    expect(buildNodePath('/veml', 'environment', 0, 1)).toBe('/veml/environment');
  });
});

describe('deepFreeze', () => {
  it('freezes a node tree so properties cannot be modified', () => {
    const mutable: MutableVemlNode = {
      kind: NodeKind.Veml,
      path: '/veml',
      range: { start: { line: 1, column: 0, offset: 0 }, end: { line: 1, column: 6, offset: 6 } },
      attributes: [
        {
          name: 'xmlns',
          value: 'test',
          nameRange: { start: { line: 1, column: 6, offset: 6 }, end: { line: 1, column: 11, offset: 11 } },
          valueRange: { start: { line: 1, column: 13, offset: 13 }, end: { line: 1, column: 17, offset: 17 } },
        },
      ],
      children: [],
      parent: undefined,
      tagName: 'veml',
    };

    const frozen = deepFreeze(mutable);

    expect(() => { (frozen as any).kind = NodeKind.Mesh; }).toThrow();
    expect(() => { (frozen.range as any).start = { line: 99, column: 0, offset: 0 }; }).toThrow();
    expect(() => { (frozen.attributes as any).push({}); }).toThrow();
    expect(() => { (frozen.children as any).push({}); }).toThrow();
  });

  it('recursively freezes children', () => {
    const child: MutableVemlNode = {
      kind: NodeKind.Mesh,
      path: '/veml/environment/mesh',
      range: { start: { line: 2, column: 0, offset: 10 }, end: { line: 2, column: 8, offset: 18 } },
      attributes: [],
      children: [],
      parent: undefined,
      tagName: 'mesh',
    };
    const parent: MutableVemlNode = {
      kind: NodeKind.Veml,
      path: '/veml',
      range: { start: { line: 1, column: 0, offset: 0 }, end: { line: 3, column: 0, offset: 30 } },
      attributes: [],
      children: [child],
      parent: undefined,
      tagName: 'veml',
    };
    child.parent = parent;

    const frozen = deepFreeze(parent);

    expect(() => { (frozen.children[0] as any).kind = NodeKind.Light; }).toThrow();
  });
});
