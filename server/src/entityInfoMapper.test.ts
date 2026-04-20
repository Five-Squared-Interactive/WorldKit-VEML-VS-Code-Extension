import { describe, it, expect } from 'vitest';
import { toEntityInfo } from './entityInfoMapper.js';
import { EntityIndex } from './entityIndex.js';
import { parseVeml } from './vemlParser.js';

function getFirstDefinition(veml: string): import('./entityIndex.js').EntityDefinition {
  const idx = new EntityIndex();
  const doc = parseVeml(veml);
  idx.indexDocument('file:///test.veml', doc);
  const defs = idx.getAllDefinitions();
  return defs[0];
}

describe('toEntityInfo', () => {
  it('maps definition with type attribute', () => {
    const def = getFirstDefinition('<veml><environment><light id="sun" type="directional"></light></environment></veml>');
    const info = toEntityInfo(def);
    expect(info.id).toBe('sun');
    expect(info.type).toBe('directional');
    expect(info.uri).toBe('file:///test.veml');
    expect(info.range).toBeDefined();
  });

  it('maps definition without type attribute', () => {
    const def = getFirstDefinition('<veml><environment><mesh id="bare"></mesh></environment></veml>');
    const info = toEntityInfo(def);
    expect(info.id).toBe('bare');
    expect(info.type).toBeUndefined();
  });

  it('result is JSON-serializable (no circular parent references)', () => {
    const def = getFirstDefinition('<veml><environment><mesh id="test" type="static"></mesh></environment></veml>');
    const info = toEntityInfo(def);
    const json = JSON.stringify(info);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe('test');
    expect(parsed.type).toBe('static');
    // Ensure no VemlNode leaked into the result
    expect(parsed).not.toHaveProperty('node');
    expect(parsed).not.toHaveProperty('parent');
    expect(parsed).not.toHaveProperty('children');
  });
});
