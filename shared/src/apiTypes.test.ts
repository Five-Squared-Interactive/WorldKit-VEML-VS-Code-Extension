import { describe, it, expect } from 'vitest';
import type {
  VemlWorldApi,
  EntityInfo,
  EntityQueryFilter,
  WorldChangeEvent,
} from './apiTypes.js';

describe('API types', () => {
  it('EntityInfo has required readonly fields', () => {
    const info: EntityInfo = {
      id: 'player',
      type: 'dynamic',
      uri: 'file:///world.veml',
      range: { start: { line: 1, column: 0, offset: 0 }, end: { line: 1, column: 10, offset: 10 } },
    };
    expect(info.id).toBe('player');
    expect(info.type).toBe('dynamic');
    expect(info.uri).toBe('file:///world.veml');
    expect(info.range.start.line).toBe(1);
  });

  it('EntityInfo type field can be undefined', () => {
    const info: EntityInfo = {
      id: 'test',
      type: undefined,
      uri: 'file:///test.veml',
      range: { start: { line: 1, column: 0, offset: 0 }, end: { line: 1, column: 5, offset: 5 } },
    };
    expect(info.type).toBeUndefined();
  });

  it('EntityQueryFilter fields are optional', () => {
    const empty: EntityQueryFilter = {};
    const typeOnly: EntityQueryFilter = { type: 'static' };
    const prefixOnly: EntityQueryFilter = { idPrefix: 'player' };
    const both: EntityQueryFilter = { type: 'dynamic', idPrefix: 'npc' };
    expect(empty).toEqual({});
    expect(typeOnly.type).toBe('static');
    expect(prefixOnly.idPrefix).toBe('player');
    expect(both.type).toBe('dynamic');
  });

  it('WorldChangeEvent has required fields with valid changeType', () => {
    const added: WorldChangeEvent = { uri: 'file:///a.veml', changeType: 'added' };
    const changed: WorldChangeEvent = { uri: 'file:///b.veml', changeType: 'changed' };
    const removed: WorldChangeEvent = { uri: 'file:///c.veml', changeType: 'removed' };
    expect(added.changeType).toBe('added');
    expect(changed.changeType).toBe('changed');
    expect(removed.changeType).toBe('removed');
  });

  it('EntityInfo is JSON-serializable (no circular references)', () => {
    const info: EntityInfo = {
      id: 'test',
      type: 'static',
      uri: 'file:///test.veml',
      range: { start: { line: 1, column: 0, offset: 0 }, end: { line: 2, column: 0, offset: 20 } },
    };
    const json = JSON.stringify(info);
    const parsed = JSON.parse(json) as EntityInfo;
    expect(parsed.id).toBe('test');
    expect(parsed.range.start.line).toBe(1);
  });

  it('VemlWorldApi shape has expected members', () => {
    // Type-level check: ensure the interface compiles with expected shape.
    // We create a mock to verify the shape at runtime.
    const mockApi: VemlWorldApi = {
      version: '0.1.0',
      queryEntities: async () => [],
      resolveReference: async () => undefined,
      getSceneHierarchy: async () => [],
      onDidChangeWorld: () => ({ dispose: () => {} }),
    };
    expect(mockApi.version).toBe('0.1.0');
    expect(typeof mockApi.queryEntities).toBe('function');
    expect(typeof mockApi.resolveReference).toBe('function');
    expect(typeof mockApi.getSceneHierarchy).toBe('function');
    expect(typeof mockApi.onDidChangeWorld).toBe('function');
  });
});
