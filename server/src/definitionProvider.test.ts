import { describe, it, expect } from 'vitest';
import { handleDefinition, findAttributeValueAtOffset } from './definitionProvider.js';
import { EntityIndex } from './entityIndex.js';
import { parseVeml } from './vemlParser.js';

function setupIndex(...docs: Array<{ uri: string; text: string }>): { index: EntityIndex; docs: Map<string, ReturnType<typeof parseVeml>> } {
  const index = new EntityIndex();
  const docMap = new Map<string, ReturnType<typeof parseVeml>>();
  for (const { uri, text } of docs) {
    const doc = parseVeml(text);
    index.indexDocument(uri, doc);
    docMap.set(uri, doc);
  }
  return { index, docs: docMap };
}

/**
 * Find offset of a substring in text — returns the position of the first character.
 */
function offsetOf(text: string, substr: string): number {
  const idx = text.indexOf(substr);
  if (idx === -1) throw new Error(`Substring "${substr}" not found in text`);
  return idx;
}

describe('handleDefinition', () => {
  it('resolves ref attribute to entity definition', () => {
    const worldText = '<veml><environment><mesh id="player"/></environment></veml>';
    const levelText = '<veml><environment><mesh id="spawn" ref="player"/></environment></veml>';
    const { index, docs } = setupIndex(
      { uri: 'file:///world.veml', text: worldText },
      { uri: 'file:///level.veml', text: levelText },
    );

    // Cursor on "player" inside ref="player"
    const offset = offsetOf(levelText, '"player"') + 1; // inside the quotes
    const result = handleDefinition(docs.get('file:///level.veml')!, offset, index);

    expect(result).not.toBeNull();
    expect(result!.uri).toBe('file:///world.veml');
  });

  it('resolves id attribute to self (identity navigation)', () => {
    const text = '<veml><environment><mesh id="hero"/></environment></veml>';
    const { index, docs } = setupIndex({ uri: 'file:///world.veml', text });

    // Cursor on "hero" inside id="hero"
    const offset = offsetOf(text, '"hero"') + 1;
    const result = handleDefinition(docs.get('file:///world.veml')!, offset, index);

    expect(result).not.toBeNull();
    expect(result!.uri).toBe('file:///world.veml');
  });

  it('returns null for non-existent ref target', () => {
    const text = '<veml><environment><mesh id="a" ref="nonexistent"/></environment></veml>';
    const { index, docs } = setupIndex({ uri: 'file:///world.veml', text });

    const offset = offsetOf(text, '"nonexistent"') + 1;
    const result = handleDefinition(docs.get('file:///world.veml')!, offset, index);

    expect(result).toBeNull();
  });

  it('returns null when cursor is on non-reference attribute', () => {
    const text = '<veml><environment><mesh id="a" src="model.glb"/></environment></veml>';
    const { index, docs } = setupIndex({ uri: 'file:///world.veml', text });

    const offset = offsetOf(text, '"model.glb"') + 1;
    const result = handleDefinition(docs.get('file:///world.veml')!, offset, index);

    expect(result).toBeNull();
  });

  it('returns null when cursor is outside attribute values', () => {
    const text = '<veml><environment><mesh id="a"/></environment></veml>';
    const { index, docs } = setupIndex({ uri: 'file:///world.veml', text });

    // Cursor on tag text, not in any attribute value
    const offset = offsetOf(text, 'environment') + 2;
    const result = handleDefinition(docs.get('file:///world.veml')!, offset, index);

    expect(result).toBeNull();
  });

  it('returns null for empty document', () => {
    const doc = parseVeml('');
    const index = new EntityIndex();
    const result = handleDefinition(doc, 0, index);
    expect(result).toBeNull();
  });

  // ── Performance ─────────────────────────────────────────────

  it('resolves definition within 200ms for large index', () => {
    const entities = Array.from({ length: 100 }, (_, i) => `<mesh id="e${i}"/>`).join('');
    const text = `<veml><environment>${entities}</environment></veml>`;
    const { index, docs } = setupIndex({ uri: 'file:///world.veml', text });

    const offset = offsetOf(text, '"e50"') + 1;
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      handleDefinition(docs.get('file:///world.veml')!, offset, index);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});

describe('findAttributeValueAtOffset', () => {
  it('finds attribute when cursor is at start of value range', () => {
    const text = '<veml><environment><mesh id="hero"/></environment></veml>';
    const doc = parseVeml(text);
    const idAttrStart = offsetOf(text, 'hero');
    const result = findAttributeValueAtOffset(doc.root!, idAttrStart);
    expect(result).toBeDefined();
    expect(result!.attribute.name).toBe('id');
    expect(result!.attribute.value).toBe('hero');
  });

  it('returns undefined when cursor is on tag name', () => {
    const text = '<veml><environment><mesh id="a"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'mesh') + 2;
    const result = findAttributeValueAtOffset(doc.root!, offset);
    expect(result).toBeUndefined();
  });

  it('matches cursor at last character of value range', () => {
    const text = '<veml><environment><mesh id="hero"/></environment></veml>';
    const doc = parseVeml(text);
    // Cursor on last char 'o' of "hero"
    const lastCharOffset = offsetOf(text, 'hero') + 3;
    const result = findAttributeValueAtOffset(doc.root!, lastCharOffset);
    expect(result).toBeDefined();
    expect(result!.attribute.value).toBe('hero');
  });

  it('returns undefined when cursor is just past end of value range', () => {
    const text = '<veml><environment><mesh id="hero"/></environment></veml>';
    const doc = parseVeml(text);
    // Cursor on closing quote (past the value)
    const pastEndOffset = offsetOf(text, 'hero') + 4; // the " after hero
    const result = findAttributeValueAtOffset(doc.root!, pastEndOffset);
    expect(result).toBeUndefined();
  });
});
