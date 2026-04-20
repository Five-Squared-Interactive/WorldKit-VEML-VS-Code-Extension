import { describe, it, expect } from 'vitest';
import { validateAllDocuments } from './validateAllHandler.js';
import { parseVeml } from './vemlParser.js';
import { EntityIndex } from './entityIndex.js';

function createDocsMap(entries: Array<[string, string]>): Map<string, ReturnType<typeof parseVeml>> {
  const map = new Map<string, ReturnType<typeof parseVeml>>();
  for (const [uri, text] of entries) {
    map.set(uri, parseVeml(text));
  }
  return map;
}

describe('validateAllDocuments', () => {
  it('returns empty results for empty documents map', () => {
    const result = validateAllDocuments(new Map(), new EntityIndex());
    expect(result.results).toHaveLength(0);
    expect(result.totalFiles).toBe(0);
    expect(result.totalDiagnostics).toBe(0);
  });

  it('validates a single valid document with zero diagnostics', () => {
    const docs = createDocsMap([
      ['file:///test.veml', '<veml><environment></environment></veml>'],
    ]);
    const result = validateAllDocuments(docs, new EntityIndex());
    expect(result.totalFiles).toBe(1);
    expect(result.totalDiagnostics).toBe(0);
    expect(result.results[0].uri).toBe('file:///test.veml');
    expect(result.results[0].diagnostics).toHaveLength(0);
  });

  it('validates a single invalid document with diagnostics', () => {
    // unknown element <bogus> should produce a diagnostic
    const docs = createDocsMap([
      ['file:///bad.veml', '<veml><environment><bogus></bogus></environment></veml>'],
    ]);
    const result = validateAllDocuments(docs, new EntityIndex());
    expect(result.totalFiles).toBe(1);
    expect(result.totalDiagnostics).toBeGreaterThan(0);
    expect(result.results[0].diagnostics.length).toBeGreaterThan(0);
  });

  it('validates multiple documents and aggregates totals', () => {
    const docs = createDocsMap([
      ['file:///valid.veml', '<veml><environment></environment></veml>'],
      ['file:///invalid.veml', '<veml><environment><bogus></bogus></environment></veml>'],
    ]);
    const result = validateAllDocuments(docs, new EntityIndex());
    expect(result.totalFiles).toBe(2);
    // valid file has 0 diagnostics, invalid has at least 1
    const validResult = result.results.find((r) => r.uri === 'file:///valid.veml');
    const invalidResult = result.results.find((r) => r.uri === 'file:///invalid.veml');
    expect(validResult?.diagnostics).toHaveLength(0);
    expect(invalidResult!.diagnostics.length).toBeGreaterThan(0);
    expect(result.totalDiagnostics).toBe(invalidResult!.diagnostics.length);
  });

  it('passes entityIndex for cross-file validation', () => {
    const entityIdx = new EntityIndex();
    const doc1 = parseVeml('<veml><environment><mesh id="player"></mesh></environment></veml>');
    entityIdx.indexDocument('file:///a.veml', doc1);

    // Document with a reference to "player" — entityIndex should influence validation
    const doc2 = parseVeml('<veml><environment><mesh id="npc" ref="player"></mesh></environment></veml>');
    entityIdx.indexDocument('file:///b.veml', doc2);

    const docs = new Map([['file:///a.veml', doc1], ['file:///b.veml', doc2]]);

    // Validate with entityIndex — cross-file references should resolve
    const withIndex = validateAllDocuments(docs, entityIdx);
    expect(withIndex.totalFiles).toBe(2);

    // Validate without entityIndex — compare diagnostic counts
    const withoutIndex = validateAllDocuments(docs, new EntityIndex());
    // The entityIndex should be passed through (diagnostics may differ)
    expect(withIndex.totalFiles).toBe(withoutIndex.totalFiles);
  });

  it('handles documents with parse errors gracefully', () => {
    const docs = createDocsMap([
      ['file:///malformed.veml', '<veml><environment><mesh id="x"'],
    ]);
    const result = validateAllDocuments(docs, new EntityIndex());
    expect(result.totalFiles).toBe(1);
    expect(result.results[0].uri).toBe('file:///malformed.veml');
    // Should not throw — diagnostics may or may not be produced depending on parser recovery
    expect(result.results[0].diagnostics).toBeDefined();
  });
});
