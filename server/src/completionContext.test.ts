import { describe, it, expect } from 'vitest';
import { getCompletionContext } from './completionContext.js';

/**
 * Helper: create a mock text document from a string.
 * The `|` marker in the input is removed and its position becomes the cursor.
 */
function docAndPos(raw: string): { text: string; offset: number; line: number; character: number } {
  const idx = raw.indexOf('|');
  if (idx === -1) throw new Error('Missing | cursor marker');
  const text = raw.slice(0, idx) + raw.slice(idx + 1);
  let line = 0;
  let lastNl = -1;
  for (let i = 0; i < idx; i++) {
    if (text[i] === '\n') {
      line++;
      lastNl = i;
    }
  }
  const character = idx - lastNl - 1;
  return { text, offset: idx, line, character };
}

describe('getCompletionContext', () => {
  // ── Element completions ───────────────────────────────────────

  it('returns element context when cursor is right after <', () => {
    const { text, offset } = docAndPos('<veml><|</veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('element');
  });

  it('returns element context with partial tag name', () => {
    const { text, offset } = docAndPos('<veml><env|</veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('element');
    expect(ctx.partialText).toBe('env');
  });

  it('provides parent tag name from context', () => {
    const { text, offset } = docAndPos('<veml><environment><|</environment></veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('element');
    expect(ctx.parentTagName).toBe('environment');
  });

  // ── Attribute name completions ────────────────────────────────

  it('returns attributeName context after tag name + space', () => {
    const { text, offset } = docAndPos('<mesh |>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeName');
    expect(ctx.currentTagName).toBe('mesh');
  });

  it('returns attributeName context with partial attribute', () => {
    const { text, offset } = docAndPos('<mesh sr|>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeName');
    expect(ctx.currentTagName).toBe('mesh');
    expect(ctx.partialText).toBe('sr');
  });

  it('returns attributeName context after existing attribute', () => {
    const { text, offset } = docAndPos('<mesh id="player" |>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeName');
    expect(ctx.currentTagName).toBe('mesh');
  });

  // ── Attribute value completions ───────────────────────────────

  it('returns attributeValue context inside attribute value quotes', () => {
    const { text, offset } = docAndPos('<mesh visible="|">');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeValue');
    expect(ctx.currentTagName).toBe('mesh');
    expect(ctx.attributeName).toBe('visible');
  });

  it('returns attributeValue context with partial value', () => {
    const { text, offset } = docAndPos('<light type="dir|">');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeValue');
    expect(ctx.currentTagName).toBe('light');
    expect(ctx.attributeName).toBe('type');
    expect(ctx.partialText).toBe('dir');
  });

  it('identifies attribute name correctly for value context', () => {
    const { text, offset } = docAndPos('<lite-procedural-sky top-color="blue" horizon-color="|">');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeValue');
    expect(ctx.attributeName).toBe('horizon-color');
  });

  // ── None context (no completions) ─────────────────────────────

  it('returns none when cursor is in text content', () => {
    const { text, offset } = docAndPos('<veml>some text|</veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('none');
  });

  it('returns none when cursor is in closing tag', () => {
    const { text, offset } = docAndPos('<veml></vem|l>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('none');
  });

  it('returns none when cursor is in a comment', () => {
    const { text, offset } = docAndPos('<!-- some |comment -->');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('none');
  });

  it('returns none for empty document', () => {
    const ctx = getCompletionContext('', 0);
    expect(ctx.kind).toBe('none');
  });

  // ── Edge cases ────────────────────────────────────────────────

  it('handles self-closing tag attribute context', () => {
    const { text, offset } = docAndPos('<position |/>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeName');
    expect(ctx.currentTagName).toBe('position');
  });

  it('handles multiline tag', () => {
    const raw = '<mesh\n  id="test"\n  |>';
    const { text, offset } = docAndPos(raw);
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeName');
    expect(ctx.currentTagName).toBe('mesh');
  });

  it('handles nested parent detection', () => {
    const { text, offset } = docAndPos('<veml><environment><container id="a"><|</container></environment></veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('element');
    expect(ctx.parentTagName).toBe('container');
  });

  it('handles cursor at very start of document with <', () => {
    const { text, offset } = docAndPos('<|');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('element');
  });

  // ── Quote-aware edge cases ──────────────────────────────────

  it('handles > inside quoted attribute values for tag scanning', () => {
    const { text, offset } = docAndPos('<mesh tag="a>b" |>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeName');
    expect(ctx.currentTagName).toBe('mesh');
  });

  it('handles > inside quotes for parent detection', () => {
    const { text, offset } = docAndPos('<veml><mesh tag="a>b"><|</mesh></veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('element');
    expect(ctx.parentTagName).toBe('mesh');
  });

  // ── Malformed document completions (AC #5) ─────────────────

  it('provides element completions in a document with unclosed sibling tags', () => {
    // Malformed: the first mesh is never closed, but cursor is in a new tag
    const { text, offset } = docAndPos('<veml><environment><mesh id="broken"><|</environment></veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('element');
    // Parent should be mesh (the unclosed one)
    expect(ctx.parentTagName).toBe('mesh');
  });

  it('provides attribute completions in a document with earlier errors', () => {
    // Malformed: unclosed tag before cursor position, but cursor is in a valid tag
    const { text, offset } = docAndPos('<veml><environment><mesh id="ok" |></environment></veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeName');
    expect(ctx.currentTagName).toBe('mesh');
  });

  it('provides value completions in a document with missing close tags', () => {
    // Malformed: no closing tags at all
    const { text, offset } = docAndPos('<veml><light type="|');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('attributeValue');
    expect(ctx.currentTagName).toBe('light');
    expect(ctx.attributeName).toBe('type');
  });

  // ── Inline script content ─────────────────────────────────────

  it('detects inline script content', () => {
    const { text, offset } = docAndPos('<veml><metadata><script>var x = |</script></metadata></veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('scriptContent');
    expect(ctx.scriptText).toContain('var x = ');
    expect(ctx.scriptOffset).toBeDefined();
  });

  it('does not detect script content for file paths', () => {
    const { text, offset } = docAndPos('<veml><metadata><script>Scripts/ind|ex.js</script></metadata></veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).not.toBe('scriptContent');
  });

  it('detects script content with API calls', () => {
    const { text, offset } = docAndPos('<veml><metadata><script>Entity.|</script></metadata></veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).toBe('scriptContent');
    expect(ctx.scriptText).toContain('Entity.');
  });

  it('does not detect script content outside <script> tags', () => {
    const { text, offset } = docAndPos('<veml><metadata>|</metadata></veml>');
    const ctx = getCompletionContext(text, offset);
    expect(ctx.kind).not.toBe('scriptContent');
  });
});
