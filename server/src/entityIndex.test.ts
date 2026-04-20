import { describe, it, expect } from 'vitest';
import { EntityIndex } from './entityIndex.js';
import { parseVeml } from './vemlParser.js';

describe('EntityIndex', () => {
  function makeIndex(...docs: Array<{ uri: string; text: string }>): EntityIndex {
    const index = new EntityIndex();
    for (const { uri, text } of docs) {
      const doc = parseVeml(text);
      index.indexDocument(uri, doc);
    }
    return index;
  }

  // ── Definition indexing ─────────────────────────────────────

  it('indexes entity id attributes as definitions', () => {
    const index = makeIndex({
      uri: 'file:///world.veml',
      text: '<veml><environment><mesh id="player"/></environment></veml>',
    });
    const def = index.getDefinition('player');
    expect(def).toBeDefined();
    expect(def!.id).toBe('player');
    expect(def!.uri).toBe('file:///world.veml');
  });

  it('indexes multiple definitions from same document', () => {
    const index = makeIndex({
      uri: 'file:///world.veml',
      text: '<veml><environment><mesh id="a"/><mesh id="b"/></environment></veml>',
    });
    expect(index.getDefinition('a')).toBeDefined();
    expect(index.getDefinition('b')).toBeDefined();
    expect(index.getDefinitionCount()).toBe(2);
  });

  it('indexes definitions across multiple documents', () => {
    const index = makeIndex(
      { uri: 'file:///a.veml', text: '<veml><environment><mesh id="e1"/></environment></veml>' },
      { uri: 'file:///b.veml', text: '<veml><environment><mesh id="e2"/></environment></veml>' },
    );
    expect(index.getDefinition('e1')!.uri).toBe('file:///a.veml');
    expect(index.getDefinition('e2')!.uri).toBe('file:///b.veml');
  });

  it('definition range points to attribute value position', () => {
    const index = makeIndex({
      uri: 'file:///world.veml',
      text: '<veml><environment><mesh id="hero"/></environment></veml>',
    });
    const def = index.getDefinition('hero');
    expect(def).toBeDefined();
    // valueRange should be the range of "hero" within the source
    expect(def!.range.start.offset).toBeGreaterThan(0);
    expect(def!.range.end.offset).toBeGreaterThan(def!.range.start.offset);
  });

  // ── Reference indexing ──────────────────────────────────────

  it('indexes ref attributes as references', () => {
    const index = makeIndex({
      uri: 'file:///level.veml',
      text: '<veml><environment><mesh id="a" ref="player"/></environment></veml>',
    });
    const refs = index.getReferences('player');
    expect(refs).toHaveLength(1);
    expect(refs[0].uri).toBe('file:///level.veml');
    expect(refs[0].attributeName).toBe('ref');
  });

  it('indexes multiple references to same entity', () => {
    const index = makeIndex(
      { uri: 'file:///a.veml', text: '<veml><environment><mesh id="x" ref="target"/></environment></veml>' },
      { uri: 'file:///b.veml', text: '<veml><environment><mesh id="y" ref="target"/></environment></veml>' },
    );
    const refs = index.getReferences('target');
    expect(refs).toHaveLength(2);
  });

  // ── Document removal ────────────────────────────────────────

  it('removeDocument clears definitions from that URI', () => {
    const index = makeIndex({
      uri: 'file:///world.veml',
      text: '<veml><environment><mesh id="player"/></environment></veml>',
    });
    expect(index.getDefinition('player')).toBeDefined();
    index.removeDocument('file:///world.veml');
    expect(index.getDefinition('player')).toBeUndefined();
  });

  it('removeDocument clears references from that URI', () => {
    const index = makeIndex(
      { uri: 'file:///a.veml', text: '<veml><environment><mesh id="x" ref="target"/></environment></veml>' },
      { uri: 'file:///b.veml', text: '<veml><environment><mesh id="y" ref="target"/></environment></veml>' },
    );
    expect(index.getReferences('target')).toHaveLength(2);
    index.removeDocument('file:///a.veml');
    expect(index.getReferences('target')).toHaveLength(1);
    expect(index.getReferences('target')[0].uri).toBe('file:///b.veml');
  });

  it('removeDocument does not affect other URIs', () => {
    const index = makeIndex(
      { uri: 'file:///a.veml', text: '<veml><environment><mesh id="e1"/></environment></veml>' },
      { uri: 'file:///b.veml', text: '<veml><environment><mesh id="e2"/></environment></veml>' },
    );
    index.removeDocument('file:///a.veml');
    expect(index.getDefinition('e1')).toBeUndefined();
    expect(index.getDefinition('e2')).toBeDefined();
  });

  // ── Edge cases ──────────────────────────────────────────────

  it('handles empty document', () => {
    const index = new EntityIndex();
    const doc = parseVeml('');
    index.indexDocument('file:///empty.veml', doc);
    expect(index.getDefinitionCount()).toBe(0);
    expect(index.getReferenceCount()).toBe(0);
  });

  it('handles document with no entities', () => {
    const index = makeIndex({
      uri: 'file:///env.veml',
      text: '<veml><environment><background><color/></background></environment></veml>',
    });
    expect(index.getDefinitionCount()).toBe(0);
  });

  it('handles duplicate IDs (last indexed document wins)', () => {
    const index = makeIndex(
      { uri: 'file:///a.veml', text: '<veml><environment><mesh id="dup"/></environment></veml>' },
      { uri: 'file:///b.veml', text: '<veml><environment><mesh id="dup"/></environment></veml>' },
    );
    // Last indexed wins
    expect(index.getDefinition('dup')!.uri).toBe('file:///b.veml');
  });

  it('recovers previous definition when winning document is removed', () => {
    const index = makeIndex(
      { uri: 'file:///a.veml', text: '<veml><environment><mesh id="dup"/></environment></veml>' },
      { uri: 'file:///b.veml', text: '<veml><environment><mesh id="dup"/></environment></veml>' },
    );
    expect(index.getDefinition('dup')!.uri).toBe('file:///b.veml');
    index.removeDocument('file:///b.veml');
    // Falls back to doc A's definition
    expect(index.getDefinition('dup')).toBeDefined();
    expect(index.getDefinition('dup')!.uri).toBe('file:///a.veml');
  });

  it('double-indexing same URI is idempotent', () => {
    const index = new EntityIndex();
    const text = '<veml><environment><mesh id="x" ref="y"/></environment></veml>';
    const doc = parseVeml(text);
    index.indexDocument('file:///world.veml', doc);
    index.indexDocument('file:///world.veml', doc);
    expect(index.getDefinitionCount()).toBe(1);
    expect(index.getReferenceCount()).toBe(1);
  });

  it('does not index id attributes on non-entity elements', () => {
    const index = makeIndex({
      uri: 'file:///world.veml',
      text: '<veml id="veml-id"><environment><mesh id="player"/></environment></veml>',
    });
    // veml element's id should NOT be indexed
    expect(index.getDefinition('veml-id')).toBeUndefined();
    // mesh element's id should be indexed
    expect(index.getDefinition('player')).toBeDefined();
    expect(index.getDefinitionCount()).toBe(1);
  });

  it('re-indexing a document updates definitions', () => {
    const index = new EntityIndex();
    const doc1 = parseVeml('<veml><environment><mesh id="old"/></environment></veml>');
    index.indexDocument('file:///world.veml', doc1);
    expect(index.getDefinition('old')).toBeDefined();

    // Re-index with updated content
    const doc2 = parseVeml('<veml><environment><mesh id="new"/></environment></veml>');
    index.removeDocument('file:///world.veml');
    index.indexDocument('file:///world.veml', doc2);
    expect(index.getDefinition('old')).toBeUndefined();
    expect(index.getDefinition('new')).toBeDefined();
  });

  it('returns empty array for unknown reference ID', () => {
    const index = new EntityIndex();
    expect(index.getReferences('nonexistent')).toEqual([]);
  });

  it('returns undefined for unknown definition ID', () => {
    const index = new EntityIndex();
    expect(index.getDefinition('nonexistent')).toBeUndefined();
  });

  // ── Counts ──────────────────────────────────────────────────

  it('getDefinitionCount returns correct count', () => {
    const index = makeIndex({
      uri: 'file:///world.veml',
      text: '<veml><environment><mesh id="a"/><mesh id="b"/><mesh id="c"/></environment></veml>',
    });
    expect(index.getDefinitionCount()).toBe(3);
  });

  it('getReferenceCount returns total reference count', () => {
    const index = makeIndex({
      uri: 'file:///world.veml',
      text: '<veml><environment><mesh id="a" ref="x"/><mesh id="b" ref="y"/></environment></veml>',
    });
    expect(index.getReferenceCount()).toBe(2);
  });
});
