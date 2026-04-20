import { describe, it, expect } from 'vitest';
import { resolveEntityReference } from './resolveEntityReferenceHandler.js';
import { EntityIndex } from './entityIndex.js';
import { parseVeml } from './vemlParser.js';

function indexDoc(entityIndex: EntityIndex, uri: string, veml: string): void {
  const doc = parseVeml(veml);
  entityIndex.indexDocument(uri, doc);
}

describe('resolveEntityReference', () => {
  it('returns EntityInfo for existing entity', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><character id="player" type="dynamic"></character></environment></veml>');
    const result = resolveEntityReference(idx, 'player');
    expect(result).toBeDefined();
    expect(result!.id).toBe('player');
    expect(result!.type).toBe('dynamic');
    expect(result!.uri).toBe('file:///a.veml');
    expect(result!.range).toBeDefined();
  });

  it('returns undefined for non-existent entity', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><character id="player" type="dynamic"></character></environment></veml>');
    const result = resolveEntityReference(idx, 'nonexistent');
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty string entityId', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><character id="player" type="dynamic"></character></environment></veml>');
    const result = resolveEntityReference(idx, '');
    expect(result).toBeUndefined();
  });

  it('returns undefined for empty index', () => {
    const result = resolveEntityReference(new EntityIndex(), 'player');
    expect(result).toBeUndefined();
  });

  it('handles entity without type attribute', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="bare"></mesh></environment></veml>');
    const result = resolveEntityReference(idx, 'bare');
    expect(result).toBeDefined();
    expect(result!.id).toBe('bare');
    expect(result!.type).toBeUndefined();
  });

  it('result is JSON-serializable', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="test" type="static"></mesh></environment></veml>');
    const result = resolveEntityReference(idx, 'test');
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe('test');
    expect(parsed.type).toBe('static');
  });

  it('resolves entity from correct document in multi-file index', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><character id="e1" type="dynamic"></character></environment></veml>');
    indexDoc(idx, 'file:///b.veml', '<veml><environment><mesh id="e2" type="static"></mesh></environment></veml>');
    const result = resolveEntityReference(idx, 'e2');
    expect(result).toBeDefined();
    expect(result!.uri).toBe('file:///b.veml');
    expect(result!.type).toBe('static');
  });
});
