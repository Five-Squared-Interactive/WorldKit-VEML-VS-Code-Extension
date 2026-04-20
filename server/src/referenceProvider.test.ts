import { describe, it, expect } from 'vitest';
import { handleReferences } from './referenceProvider.js';
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

function offsetOf(text: string, substr: string): number {
  const idx = text.indexOf(substr);
  if (idx === -1) throw new Error(`Substring "${substr}" not found in text`);
  return idx;
}

describe('handleReferences', () => {
  it('finds all references to an entity from id attribute', () => {
    const worldText = '<veml><environment><light id="sun"/></environment></veml>';
    const aText = '<veml><environment><mesh id="x" ref="sun"/></environment></veml>';
    const bText = '<veml><environment><mesh id="y" ref="sun"/></environment></veml>';
    const { index, docs } = setupIndex(
      { uri: 'file:///world.veml', text: worldText },
      { uri: 'file:///a.veml', text: aText },
      { uri: 'file:///b.veml', text: bText },
    );

    // Cursor on "sun" in id="sun"
    const offset = offsetOf(worldText, '"sun"') + 1;
    const results = handleReferences(docs.get('file:///world.veml')!, offset, index, false);

    expect(results).toHaveLength(2);
    const uris = results.map((r) => r.uri).sort();
    expect(uris).toContain('file:///a.veml');
    expect(uris).toContain('file:///b.veml');
  });

  it('includes declaration when includeDeclaration is true', () => {
    const worldText = '<veml><environment><light id="sun"/></environment></veml>';
    const aText = '<veml><environment><mesh id="x" ref="sun"/></environment></veml>';
    const { index, docs } = setupIndex(
      { uri: 'file:///world.veml', text: worldText },
      { uri: 'file:///a.veml', text: aText },
    );

    const offset = offsetOf(worldText, '"sun"') + 1;
    const results = handleReferences(docs.get('file:///world.veml')!, offset, index, true);

    // 1 ref + 1 declaration
    expect(results).toHaveLength(2);
    const uris = results.map((r) => r.uri);
    expect(uris).toContain('file:///world.veml');
    expect(uris).toContain('file:///a.veml');
  });

  it('excludes declaration when includeDeclaration is false', () => {
    const worldText = '<veml><environment><light id="sun"/></environment></veml>';
    const aText = '<veml><environment><mesh id="x" ref="sun"/></environment></veml>';
    const { index, docs } = setupIndex(
      { uri: 'file:///world.veml', text: worldText },
      { uri: 'file:///a.veml', text: aText },
    );

    const offset = offsetOf(worldText, '"sun"') + 1;
    const results = handleReferences(docs.get('file:///world.veml')!, offset, index, false);

    expect(results).toHaveLength(1);
    expect(results[0].uri).toBe('file:///a.veml');
  });

  it('finds references from ref attribute cursor position', () => {
    const text = '<veml><environment><mesh id="a" ref="target"/></environment></veml>';
    const targetText = '<veml><environment><container id="target"/></environment></veml>';
    const { index, docs } = setupIndex(
      { uri: 'file:///ref.veml', text },
      { uri: 'file:///target.veml', text: targetText },
    );

    // Cursor on "target" in ref="target"
    const offset = offsetOf(text, '"target"') + 1;
    const results = handleReferences(docs.get('file:///ref.veml')!, offset, index, false);

    expect(results).toHaveLength(1);
    expect(results[0].uri).toBe('file:///ref.veml');
  });

  it('returns empty for entity with no references', () => {
    const text = '<veml><environment><mesh id="lonely"/></environment></veml>';
    const { index, docs } = setupIndex({ uri: 'file:///world.veml', text });

    const offset = offsetOf(text, '"lonely"') + 1;
    const results = handleReferences(docs.get('file:///world.veml')!, offset, index, false);

    expect(results).toHaveLength(0);
  });

  it('returns empty when cursor is outside relevant attributes', () => {
    const text = '<veml><environment><mesh id="a" src="model.glb"/></environment></veml>';
    const { index, docs } = setupIndex({ uri: 'file:///world.veml', text });

    // Cursor on "model.glb" - not an id or ref attribute
    const offset = offsetOf(text, '"model.glb"') + 1;
    const results = handleReferences(docs.get('file:///world.veml')!, offset, index, false);

    expect(results).toHaveLength(0);
  });

  it('returns empty for empty document', () => {
    const doc = parseVeml('');
    const index = new EntityIndex();
    const results = handleReferences(doc, 0, index, false);
    expect(results).toHaveLength(0);
  });
});
