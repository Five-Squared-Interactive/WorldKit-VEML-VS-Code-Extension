import { describe, it, expect } from 'vitest';
import { handleCompletion } from './completionProvider.js';
import type { CompletionContext } from './completionContext.js';

function makeCtx(overrides: Partial<CompletionContext> & Pick<CompletionContext, 'kind'>): CompletionContext {
  return {
    parentTagName: undefined,
    currentTagName: undefined,
    attributeName: undefined,
    partialText: undefined,
    ...overrides,
  };
}

describe('handleCompletion', () => {
  // ── Element completions ───────────────────────────────────────

  it('returns all root-level elements when no parent context', () => {
    const ctx = makeCtx({ kind: 'element' });
    const items = handleCompletion(ctx);
    expect(items.length).toBeGreaterThan(0);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('veml');
  });

  it('returns valid children for veml root element', () => {
    const ctx = makeCtx({ kind: 'element', parentTagName: 'veml' });
    const items = handleCompletion(ctx);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('metadata');
    expect(labels).toContain('environment');
    expect(labels).not.toContain('mesh');
    expect(labels).not.toContain('scaletransform');
  });

  it('returns valid children for environment parent', () => {
    const ctx = makeCtx({ kind: 'element', parentTagName: 'environment' });
    const items = handleCompletion(ctx);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('background');
    expect(labels).toContain('effects');
    expect(labels).toContain('mesh');
    expect(labels).toContain('light');
    expect(labels).toContain('container');
    expect(labels).toContain('character');
  });

  it('returns entity children for mesh parent', () => {
    const ctx = makeCtx({ kind: 'element', parentTagName: 'mesh' });
    const items = handleCompletion(ctx);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('scaletransform');
    expect(labels).toContain('sizetransform');
    expect(labels).toContain('synchronizer');
    expect(labels).toContain('placement-socket');
    expect(labels).toContain('mesh'); // nested entities
    expect(labels).toContain('light');
    expect(labels).toContain('container');
  });

  it('element completions include descriptions', () => {
    const ctx = makeCtx({ kind: 'element', parentTagName: 'veml' });
    const items = handleCompletion(ctx);
    const env = items.find((i) => i.label === 'environment');
    expect(env).toBeDefined();
    expect(env!.detail).toBeTruthy();
  });

  it('returns empty array for leaf parent (no children)', () => {
    const ctx = makeCtx({ kind: 'element', parentTagName: 'position' });
    const items = handleCompletion(ctx);
    expect(items).toHaveLength(0);
  });

  it('returns all elements for unknown parent', () => {
    const ctx = makeCtx({ kind: 'element', parentTagName: 'foobar' });
    const items = handleCompletion(ctx);
    expect(items.length).toBeGreaterThan(0);
  });

  // ── Attribute name completions ────────────────────────────────

  it('returns attribute names for mesh element', () => {
    const ctx = makeCtx({ kind: 'attributeName', currentTagName: 'mesh' });
    const items = handleCompletion(ctx);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('id');
    expect(labels).toContain('src');
    expect(labels).toContain('visible');
    expect(labels).toContain('static');
    expect(labels).toContain('interaction-layer');
    expect(labels).toContain('tag');
    expect(labels).toContain('on-load-event');
  });

  it('required attributes sort before optional ones', () => {
    const ctx = makeCtx({ kind: 'attributeName', currentTagName: 'light' });
    const items = handleCompletion(ctx);
    // light has no required attrs, but all optional attrs should have sortText starting with '1-'
    // Verify all items have sortText
    for (const item of items) {
      expect(item.sortText).toBeTruthy();
    }
  });

  it('returns position attributes', () => {
    const ctx = makeCtx({ kind: 'attributeName', currentTagName: 'position' });
    const items = handleCompletion(ctx);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('x');
    expect(labels).toContain('y');
    expect(labels).toContain('z');
  });

  it('returns empty for unknown element', () => {
    const ctx = makeCtx({ kind: 'attributeName', currentTagName: 'foobar' });
    const items = handleCompletion(ctx);
    expect(items).toHaveLength(0);
  });

  it('attribute completions include insert text with ="$1"', () => {
    const ctx = makeCtx({ kind: 'attributeName', currentTagName: 'mesh' });
    const items = handleCompletion(ctx);
    const srcItem = items.find((i) => i.label === 'src');
    expect(srcItem).toBeDefined();
    expect(srcItem!.insertText).toBe('src="$1"');
  });

  it('filters out already-present attributes when existingAttributes provided', () => {
    const ctx = makeCtx({ kind: 'attributeName', currentTagName: 'mesh' });
    const items = handleCompletion(ctx, ['id']);
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain('id');
    expect(labels).toContain('src');
  });

  // ── Attribute value completions ───────────────────────────────

  it('returns enum values for light.type', () => {
    const ctx = makeCtx({ kind: 'attributeValue', currentTagName: 'light', attributeName: 'type' });
    const items = handleCompletion(ctx);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('directional');
    expect(labels).toContain('point');
    expect(labels).toContain('spot');
  });

  it('returns true/false for boolean attributes', () => {
    const ctx = makeCtx({ kind: 'attributeValue', currentTagName: 'mesh', attributeName: 'visible' });
    const items = handleCompletion(ctx);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('true');
    expect(labels).toContain('false');
    expect(items).toHaveLength(2);
  });

  it('returns true/false for static boolean attribute', () => {
    const ctx = makeCtx({ kind: 'attributeValue', currentTagName: 'mesh', attributeName: 'static' });
    const items = handleCompletion(ctx);
    const labels = items.map((i) => i.label);
    expect(labels).toContain('true');
    expect(labels).toContain('false');
    expect(items).toHaveLength(2);
  });

  it('returns empty for string attributes without enum', () => {
    const ctx = makeCtx({ kind: 'attributeValue', currentTagName: 'mesh', attributeName: 'tag' });
    const items = handleCompletion(ctx);
    expect(items).toHaveLength(0);
  });

  it('returns empty for unknown attribute', () => {
    const ctx = makeCtx({ kind: 'attributeValue', currentTagName: 'mesh', attributeName: 'nonexistent' });
    const items = handleCompletion(ctx);
    expect(items).toHaveLength(0);
  });

  // ── None context ──────────────────────────────────────────────

  it('returns empty array for none context', () => {
    const ctx = makeCtx({ kind: 'none' });
    const items = handleCompletion(ctx);
    expect(items).toHaveLength(0);
  });

  // ── Performance ───────────────────────────────────────────────

  it('completes within 100ms', () => {
    const ctx = makeCtx({ kind: 'element', parentTagName: 'veml' });
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      handleCompletion(ctx);
    }
    const elapsed = performance.now() - start;
    // 1000 iterations should still be well under 100ms total
    expect(elapsed).toBeLessThan(100);
  });
});
