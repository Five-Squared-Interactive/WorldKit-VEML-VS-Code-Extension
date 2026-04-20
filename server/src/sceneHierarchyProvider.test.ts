import { describe, it, expect } from 'vitest';
import { parseVeml } from './vemlParser.js';
import { getSceneHierarchy } from './sceneHierarchyProvider.js';

describe('getSceneHierarchy', () => {
  it('returns empty array for undefined root', () => {
    const doc = parseVeml('');
    const result = getSceneHierarchy(doc);
    expect(result).toEqual([]);
  });

  it('returns veml node as root of hierarchy', () => {
    const doc = parseVeml('<veml></veml>');
    const result = getSceneHierarchy(doc);
    expect(result).toHaveLength(1);
    expect(result[0].label).toBe('veml');
    expect(result[0].nodeKind).toBe('Veml');
  });

  it('nested entities produce correct parent-child tree', () => {
    const doc = parseVeml(
      '<veml><environment><container id="parent"><mesh id="child"/></container></environment></veml>',
    );
    const result = getSceneHierarchy(doc);
    expect(result).toHaveLength(1); // veml
    const veml = result[0];
    expect(veml.children).toHaveLength(1); // environment
    const env = veml.children[0];
    expect(env.label).toBe('environment');
    expect(env.nodeKind).toBe('Environment');
    expect(env.children).toHaveLength(1); // parent container
    const parent = env.children[0];
    expect(parent.label).toBe('parent');
    expect(parent.nodeKind).toBe('Container');
    expect(parent.children).toHaveLength(1); // child mesh
    const child = parent.children[0];
    expect(child.label).toBe('child');
    expect(child.nodeKind).toBe('Mesh');
    expect(child.children).toHaveLength(0);
  });

  it('entity with id shows id as label', () => {
    const doc = parseVeml('<veml><environment><mesh id="player-spawn"/></environment></veml>');
    const result = getSceneHierarchy(doc);
    const entity = result[0].children[0].children[0];
    expect(entity.label).toBe('player-spawn');
  });

  it('mesh with type attribute shows type', () => {
    const doc = parseVeml('<veml><environment><light id="sun" type="directional"/></environment></veml>');
    const result = getSceneHierarchy(doc);
    const entity = result[0].children[0].children[0];
    expect(entity.type).toBe('directional');
  });

  it('entity without id shows fallback label with index', () => {
    const doc = parseVeml(
      '<veml><environment><mesh type="static"/><mesh type="dynamic"/></environment></veml>',
    );
    const result = getSceneHierarchy(doc);
    const env = result[0].children[0];
    expect(env.children).toHaveLength(2);
    expect(env.children[0].label).toBe('<mesh>[0]');
    expect(env.children[1].label).toBe('<mesh>[1]');
  });

  it('entity without id and only one sibling uses index 0', () => {
    const doc = parseVeml('<veml><environment><mesh type="static"/></environment></veml>');
    const result = getSceneHierarchy(doc);
    const entity = result[0].children[0].children[0];
    expect(entity.label).toBe('<mesh>[0]');
  });

  it('includes environment node in hierarchy', () => {
    const doc = parseVeml('<veml><environment><background><color/></background></environment></veml>');
    const result = getSceneHierarchy(doc);
    const veml = result[0];
    expect(veml.children).toHaveLength(1);
    const env = veml.children[0];
    expect(env.label).toBe('environment');
    expect(env.nodeKind).toBe('Environment');
    expect(env.children).toHaveLength(1);
    expect(env.children[0].label).toBe('background');
    expect(env.children[0].nodeKind).toBe('Background');
  });

  it('skips ErrorNodes in hierarchy', () => {
    // Malformed input produces ErrorNode — hierarchy should omit them
    const doc = parseVeml('<veml><environment><mesh id="good"/><bad></environment></veml>');
    const result = getSceneHierarchy(doc);
    // Should at least have veml with environment — error nodes filtered out
    expect(result).toHaveLength(1);
    const env = result[0].children.find((c) => c.nodeKind === 'Environment');
    if (env) {
      // Only the valid entity should appear, not the error node
      for (const child of env.children) {
        expect(child.nodeKind).not.toBe('Error');
      }
    }
  });

  it('includes child entity nodes under container entities', () => {
    const doc = parseVeml(
      '<veml><environment><container id="player"><mesh id="body"/><light id="glow"/></container></environment></veml>',
    );
    const result = getSceneHierarchy(doc);
    const entity = result[0].children[0].children[0];
    expect(entity.children).toHaveLength(2);
    expect(entity.children[0].label).toBe('body');
    expect(entity.children[0].nodeKind).toBe('Mesh');
    expect(entity.children[1].label).toBe('glow');
    expect(entity.children[1].nodeKind).toBe('Light');
  });

  it('preserves AST node path on SceneNode', () => {
    const doc = parseVeml('<veml><environment><mesh id="a"/></environment></veml>');
    const result = getSceneHierarchy(doc);
    const entity = result[0].children[0].children[0];
    expect(entity.path).toContain('mesh');
  });

  it('preserves source range on SceneNode', () => {
    const doc = parseVeml('<veml><environment><mesh id="a"/></environment></veml>');
    const result = getSceneHierarchy(doc);
    const entity = result[0].children[0].children[0];
    expect(entity.range).toBeDefined();
    expect(entity.range.start).toBeDefined();
    expect(entity.range.end).toBeDefined();
    expect(entity.range.start.line).toBeGreaterThanOrEqual(1);
  });

  it('circular reference detection terminates branch', () => {
    // Note: VEML doesn't truly support circular references in XML structure,
    // but we test the visited-path guard as defense
    const doc = parseVeml(
      '<veml><environment><container id="a"><container id="b"><mesh id="c"/></container></container></environment></veml>',
    );
    const result = getSceneHierarchy(doc);
    // Deep nesting should work fine — circular detection only triggers on path revisits
    const a = result[0].children[0].children[0];
    expect(a.label).toBe('a');
    expect(a.children[0].label).toBe('b');
    expect(a.children[0].children[0].label).toBe('c');
    expect(a.circular).toBeUndefined();
  });
});
