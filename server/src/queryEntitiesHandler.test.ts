import { describe, it, expect } from 'vitest';
import { queryEntities } from './queryEntitiesHandler.js';
import { EntityIndex } from './entityIndex.js';
import { parseVeml } from './vemlParser.js';

function indexDoc(entityIndex: EntityIndex, uri: string, veml: string): void {
  const doc = parseVeml(veml);
  entityIndex.indexDocument(uri, doc);
}

describe('queryEntities', () => {
  it('returns empty array for empty index', () => {
    const result = queryEntities(new EntityIndex());
    expect(result).toHaveLength(0);
  });

  it('returns all entities when no filter', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><character id="player"></character><mesh id="ground"></mesh></environment></veml>');
    const result = queryEntities(idx);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.id).sort()).toEqual(['ground', 'player']);
  });

  it('filters by type', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="p1" type="dynamic"></mesh><mesh id="g1" type="static"></mesh><mesh id="p2" type="dynamic"></mesh></environment></veml>');
    const result = queryEntities(idx, { type: 'dynamic' });
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.type === 'dynamic')).toBe(true);
  });

  it('filters by idPrefix', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><character id="player-1"></character><character id="player-2"></character><mesh id="ground"></mesh></environment></veml>');
    const result = queryEntities(idx, { idPrefix: 'player' });
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.id.startsWith('player'))).toBe(true);
  });

  it('applies combined filter with AND logic', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="player-1" type="dynamic"></mesh><mesh id="player-2" type="static"></mesh><mesh id="npc-1" type="dynamic"></mesh></environment></veml>');
    const result = queryEntities(idx, { type: 'dynamic', idPrefix: 'player' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('player-1');
  });

  it('returns empty array when filter matches nothing', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="ground" type="static"></mesh></environment></veml>');
    const result = queryEntities(idx, { type: 'nonexistent' });
    expect(result).toHaveLength(0);
  });

  it('returns all with empty filter object', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="a"></mesh></environment></veml>');
    const result = queryEntities(idx, {});
    expect(result).toHaveLength(1);
  });

  it('returns all with undefined filter', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="a"></mesh></environment></veml>');
    const result = queryEntities(idx, undefined);
    expect(result).toHaveLength(1);
  });

  it('includes entities from multiple documents', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="e1"></mesh></environment></veml>');
    indexDoc(idx, 'file:///b.veml', '<veml><environment><mesh id="e2"></mesh></environment></veml>');
    const result = queryEntities(idx);
    expect(result).toHaveLength(2);
  });

  it('returns EntityInfo with correct uri and range', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///test.veml', '<veml><environment><character id="player" type="dynamic"></character></environment></veml>');
    const result = queryEntities(idx);
    expect(result).toHaveLength(1);
    expect(result[0].uri).toBe('file:///test.veml');
    expect(result[0].range).toBeDefined();
    expect(result[0].range.start).toBeDefined();
  });

  it('EntityInfo is JSON-serializable', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="test" type="static"></mesh></environment></veml>');
    const result = queryEntities(idx);
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe('test');
  });

  it('handles entity without type attribute', () => {
    const idx = new EntityIndex();
    indexDoc(idx, 'file:///a.veml', '<veml><environment><mesh id="bare"></mesh></environment></veml>');
    const result = queryEntities(idx);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBeUndefined();
  });
});
