import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseVeml } from './vemlParser.js';
import {
  NodeKind,
  isVemlNode,
  isEntityNode,
  findNodes,
  visitNode,
} from '../../shared/src/index.js';
import type { VemlNode } from '../../shared/src/index.js';

const projectRoot = path.resolve(__dirname, '../..');

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(projectRoot, `syntaxes/__fixtures__/${name}`), 'utf8');
}

describe('VEML Parser: Valid Document Parsing', () => {
  it('parses a valid VEML document with root Document node', () => {
    const doc = parseVeml('<veml><metadata><title>Test</title></metadata><environment><background><color /></background></environment></veml>');
    expect(doc.root).toBeDefined();
    expect(doc.root!.kind).toBe(NodeKind.Document);
    expect(doc.errors).toHaveLength(0);
  });

  it('parses the valid-world fixture without errors', () => {
    const text = loadFixture('valid-world.veml');
    const doc = parseVeml(text);
    expect(doc.root).toBeDefined();
    expect(doc.errors).toHaveLength(0);
  });

  it('creates correct node kinds for all VEML elements', () => {
    const text = loadFixture('valid-world.veml');
    const doc = parseVeml(text);

    const allNodes: VemlNode[] = [];
    visitNode(doc.root!, { enter(node) { allNodes.push(node); } });

    const kinds = new Set(allNodes.map((n) => n.kind));
    expect(kinds.has(NodeKind.Veml)).toBe(true);
    expect(kinds.has(NodeKind.Environment)).toBe(true);
    expect(kinds.has(NodeKind.Mesh)).toBe(true);
    expect(kinds.has(NodeKind.Character)).toBe(true);
    expect(kinds.has(NodeKind.Light)).toBe(true);
  });

  it('preserves parent-child nesting', () => {
    const doc = parseVeml('<veml><environment><mesh id="a"></mesh></environment></veml>');
    const root = doc.root!;

    // Document -> veml -> environment -> mesh
    expect(root.children).toHaveLength(1);
    const veml = root.children[0];
    expect(veml.kind).toBe(NodeKind.Veml);
    expect(veml.children).toHaveLength(1);
    const env = veml.children[0];
    expect(env.kind).toBe(NodeKind.Environment);
    expect(env.children).toHaveLength(1);
    const mesh = env.children[0];
    expect(mesh.kind).toBe(NodeKind.Mesh);
  });

  it('handles self-closing tags', () => {
    const doc = parseVeml('<veml><environment><mesh id="a" src="test.glb" /></environment></veml>');
    const meshes = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh);
    expect(meshes).toHaveLength(1);
    expect(meshes[0].children).toHaveLength(0);
  });

  it('handles empty documents gracefully', () => {
    const doc = parseVeml('');
    expect(doc.root).toBeDefined();
    expect(doc.root!.kind).toBe(NodeKind.Document);
    // saxes reports "document must contain a root element" — produces error nodes
    expect(doc.errors.length).toBeGreaterThan(0);
  });

  it('parses the complex-nesting fixture', () => {
    const text = loadFixture('complex-nesting.veml');
    const doc = parseVeml(text);
    expect(doc.root).toBeDefined();

    // Should have nested entities
    const entities = findNodes(doc.root!, (n) => isEntityNode(n));
    expect(entities.length).toBeGreaterThan(0);
  });
});

describe('VEML Parser: Node Structure', () => {
  it('assigns correct kind from tag name', () => {
    const doc = parseVeml('<veml><environment><background><lite-procedural-sky /></background></environment></veml>');
    const sky = findNodes(doc.root!, (n) => n.kind === NodeKind.LiteProceduralSky);
    expect(sky).toHaveLength(1);
    expect(sky[0].tagName).toBe('lite-procedural-sky');
  });

  it('assigns Unknown kind to unrecognized tags', () => {
    const doc = parseVeml('<veml><foobar /></veml>');
    const unknown = findNodes(doc.root!, (n) => n.kind === NodeKind.Unknown);
    expect(unknown).toHaveLength(1);
    expect(unknown[0].tagName).toBe('foobar');
  });

  it('stores tagName in lowercase', () => {
    const doc = parseVeml('<Veml><Mesh id="test"></Mesh></Veml>');
    const veml = findNodes(doc.root!, (n) => isVemlNode(n));
    expect(veml).toHaveLength(1);
    expect(veml[0].tagName).toBe('veml');
  });
});

describe('VEML Parser: Path Disambiguation (AC #3)', () => {
  it('disambiguates sibling entities with indices', () => {
    const doc = parseVeml(
      '<veml><environment><mesh id="a"></mesh><mesh id="b"></mesh></environment></veml>',
    );
    const meshes = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh);
    expect(meshes).toHaveLength(2);
    expect(meshes[0].path).toBe('/veml/environment/mesh[0]');
    expect(meshes[1].path).toBe('/veml/environment/mesh[1]');
  });

  it('omits index for unique siblings', () => {
    const doc = parseVeml('<veml><metadata /><environment /></veml>');
    const env = findNodes(doc.root!, (n) => n.kind === NodeKind.Environment);
    expect(env).toHaveLength(1);
    expect(env[0].path).toBe('/veml/environment');
  });

  it('builds correct paths for deeply nested elements', () => {
    const doc = parseVeml(
      '<veml><environment><container id="parent"><mesh id="child"><scaletransform><position x="0" y="0" z="0" /></scaletransform></mesh></container></environment></veml>',
    );
    const positions = findNodes(doc.root!, (n) => n.kind === NodeKind.Position);
    expect(positions).toHaveLength(1);
    expect(positions[0].path).toContain('/position');
  });
});

describe('VEML Parser: Attribute Source Locations (AC #4)', () => {
  it('extracts attribute name and value', () => {
    const doc = parseVeml('<mesh id="player"></mesh>');
    const mesh = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    expect(mesh.attributes).toHaveLength(1);
    expect(mesh.attributes[0].name).toBe('id');
    expect(mesh.attributes[0].value).toBe('player');
  });

  it('tracks attribute name source range', () => {
    const doc = parseVeml('<mesh id="player"></mesh>');
    const mesh = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    const attr = mesh.attributes[0];

    // Name "id" starts at some column in line 1
    expect(attr.nameRange.start.line).toBe(1);
    expect(attr.nameRange.end.line).toBe(1);
    expect(attr.nameRange.end.offset).toBeGreaterThan(attr.nameRange.start.offset);
  });

  it('tracks attribute value source range', () => {
    const doc = parseVeml('<mesh id="player"></mesh>');
    const mesh = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    const attr = mesh.attributes[0];

    expect(attr.valueRange.start.line).toBe(1);
    expect(attr.valueRange.end.offset).toBeGreaterThan(attr.valueRange.start.offset);
    // Value range should span "player" (6 chars)
    expect(attr.valueRange.end.offset - attr.valueRange.start.offset).toBe(6);
  });

  it('handles multiple attributes', () => {
    const doc = parseVeml('<mesh id="test" src="model.glb"></mesh>');
    const mesh = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    expect(mesh.attributes).toHaveLength(2);
    expect(mesh.attributes[0].name).toBe('id');
    expect(mesh.attributes[1].name).toBe('src');
  });

  it('handles self-closing tags with attributes', () => {
    const doc = parseVeml('<position x="0" y="1" z="0" />');
    const position = findNodes(doc.root!, (n) => n.kind === NodeKind.Position)[0];
    expect(position.attributes).toHaveLength(3);
    expect(position.attributes[0].name).toBe('x');
    expect(position.attributes[0].value).toBe('0');
  });
});

describe('VEML Parser: Error Recovery (AC #2)', () => {
  it('creates ErrorNode for malformed content and continues parsing', () => {
    const doc = parseVeml('<veml><mesh></meh></veml>');
    // Should have error nodes but still parse the veml root
    const vemlNodes = findNodes(doc.root!, (n) => isVemlNode(n));
    expect(vemlNodes.length).toBeGreaterThan(0);
  });

  it('preserves valid nodes around errors', () => {
    const doc = parseVeml(
      '<veml><mesh id="good"></mesh><mesh></meh><mesh id="also-good"></mesh></veml>',
    );
    const meshes = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh);
    // Should find at least the valid entities
    expect(meshes.length).toBeGreaterThanOrEqual(2);
  });

  it('reports errors in VemlDocument.errors array', () => {
    const doc = parseVeml('<veml><mesh></meh></veml>');
    expect(doc.errors.length).toBeGreaterThan(0);
    expect(doc.errors[0].kind).toBe(NodeKind.Error);
    expect(doc.errors[0].errorMessage).toBeTruthy();
  });

  it('populates rawText on ErrorNode with source context', () => {
    const doc = parseVeml('<veml><mesh></meh></veml>');
    expect(doc.errors.length).toBeGreaterThan(0);
    expect(doc.errors[0].rawText).toBeTruthy();
    expect(doc.errors[0].rawText.length).toBeGreaterThan(0);
  });

  it('parses the malformed fixture with error recovery', () => {
    const text = loadFixture('malformed.veml');
    const doc = parseVeml(text);
    expect(doc.root).toBeDefined();
    // Should have some errors but not crash
    expect(doc.errors.length).toBeGreaterThan(0);

    // Should still find some valid entity nodes after recovery
    const entities = findNodes(doc.root!, (n) => isEntityNode(n));
    expect(entities.length).toBeGreaterThan(0);
  });
});

describe('VEML Parser: CRLF Handling (AC #6)', () => {
  it('produces correct source ranges for LF documents', () => {
    const text = '<veml>\n  <mesh id="a"></mesh>\n</veml>';
    const doc = parseVeml(text);
    const mesh = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    expect(mesh.range.start.line).toBe(2);
  });

  it('produces correct source ranges for CRLF documents', () => {
    const text = '<veml>\r\n  <mesh id="a"></mesh>\r\n</veml>';
    const doc = parseVeml(text);
    const mesh = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    expect(mesh.range.start.line).toBe(2);
  });

  it('produces structurally identical ASTs for LF and CRLF', () => {
    const lfText = '<veml>\n  <mesh id="a"></mesh>\n</veml>';
    const crlfText = '<veml>\r\n  <mesh id="a"></mesh>\r\n</veml>';

    const lfDoc = parseVeml(lfText);
    const crlfDoc = parseVeml(crlfText);

    // Same node structure
    const lfNodes: NodeKind[] = [];
    const crlfNodes: NodeKind[] = [];
    visitNode(lfDoc.root!, { enter(n) { lfNodes.push(n.kind); } });
    visitNode(crlfDoc.root!, { enter(n) { crlfNodes.push(n.kind); } });
    expect(lfNodes).toEqual(crlfNodes);

    // Same line numbers for entities
    const lfMesh = findNodes(lfDoc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    const crlfMesh = findNodes(crlfDoc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    expect(lfMesh.range.start.line).toBe(crlfMesh.range.start.line);
  });
});

describe('VEML Parser: Immutability (AC #5)', () => {
  it('prevents modification of node properties', () => {
    const doc = parseVeml('<veml><mesh id="test"></mesh></veml>');
    const veml = findNodes(doc.root!, (n) => isVemlNode(n))[0];
    expect(() => { (veml as any).kind = NodeKind.Mesh; }).toThrow();
  });

  it('prevents modification of children array', () => {
    const doc = parseVeml('<veml><mesh id="test"></mesh></veml>');
    const veml = findNodes(doc.root!, (n) => isVemlNode(n))[0];
    expect(() => { (veml.children as any).push({}); }).toThrow();
  });

  it('prevents modification of attributes array', () => {
    const doc = parseVeml('<mesh id="test"></mesh>');
    const mesh = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    expect(() => { (mesh.attributes as any).push({}); }).toThrow();
  });

  it('prevents modification of source ranges', () => {
    const doc = parseVeml('<mesh id="test"></mesh>');
    const mesh = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    expect(() => { (mesh.range as any).start = { line: 99, column: 0, offset: 0 }; }).toThrow();
  });

  it('makes parent non-enumerable to avoid circular serialization', () => {
    const doc = parseVeml('<veml><mesh id="test"></mesh></veml>');
    const mesh = findNodes(doc.root!, (n) => n.kind === NodeKind.Mesh)[0];
    // parent should exist but not be enumerable
    expect(mesh.parent).toBeDefined();
    const descriptor = Object.getOwnPropertyDescriptor(mesh, 'parent');
    expect(descriptor!.enumerable).toBe(false);
    // JSON.stringify should not throw (no circular reference via enumerable props)
    expect(() => JSON.stringify(mesh)).not.toThrow();
  });
});

describe('VEML Parser: Edge Cases', () => {
  it('handles document with only whitespace gracefully', () => {
    const doc = parseVeml('   \n  \n  ');
    expect(doc.root).toBeDefined();
    // saxes reports errors for whitespace-only documents (no root element)
    expect(doc.errors.length).toBeGreaterThan(0);
  });

  it('handles minimal single-element document', () => {
    const doc = parseVeml('<veml />');
    const vemlNodes = findNodes(doc.root!, (n) => isVemlNode(n));
    expect(vemlNodes).toHaveLength(1);
  });

  it('handles processing instructions', () => {
    const doc = parseVeml('<?xml version="1.0"?><veml></veml>');
    expect(doc.root).toBeDefined();
    const vemlNodes = findNodes(doc.root!, (n) => isVemlNode(n));
    expect(vemlNodes).toHaveLength(1);
  });

  it('stores source text in VemlDocument', () => {
    const text = '<veml />';
    const doc = parseVeml(text);
    expect(doc.text).toBe(text);
  });
});
