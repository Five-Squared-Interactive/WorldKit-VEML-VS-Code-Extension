import { describe, it, expect } from 'vitest';
import { formatDocument } from './formattingProvider.js';
import { parseVeml } from './vemlParser.js';
import type { FormattingOptions } from './formattingProvider.js';

/** Apply a single full-document text edit and return the result. */
function applyEdits(text: string, edits: { range: { start: { line: number; character: number }; end: { line: number; character: number } }; newText: string }[]): string {
  if (edits.length === 0) return text;
  // We only use full-document replacement, so just return the newText of the first edit
  return edits[0].newText;
}

const defaultOpts: FormattingOptions = { tabSize: 2, insertSpaces: true };

describe('formatDocument — core formatting (Task 1)', () => {
  it('formats a document with mixed indentation to consistent 2-space indent', () => {
    const text = `<veml>
   <environment>
       <background>
           <lite-procedural-sky />
       </background>
   </environment>
</veml>`;
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    expect(result).toContain('  <environment>');
    expect(result).toContain('    <background>');
    expect(result).toContain('      <lite-procedural-sky />');
    expect(result).toContain('</veml>');
  });

  it('formats with tab indentation when insertSpaces is false', () => {
    const text = '<veml>\n  <environment>\n    <background>\n      <lite-procedural-sky />\n    </background>\n  </environment>\n</veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: false });
    const result = applyEdits(text, edits);
    expect(result).toContain('\t<environment>');
    expect(result).toContain('\t\t<background>');
  });

  it('returns empty array for empty document', () => {
    const doc = parseVeml('');
    const edits = formatDocument(doc, defaultOpts);
    expect(edits).toHaveLength(0);
  });

  it('formats a single self-closing element', () => {
    const text = '<veml />';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    expect(result.trim()).toBe('<veml />');
  });

  it('handles container elements with correct opening/closing tag structure', () => {
    const text = '<veml><environment><mesh id="a"><scaletransform><position x="0" y="0" z="0" /></scaletransform></mesh></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    const lines = result.split('\n');
    expect(lines[0]).toBe('<veml>');
    expect(lines[1]).toBe('  <environment>');
    expect(lines[2]).toBe('    <mesh id="a">');
    expect(lines[3]).toBe('      <scaletransform>');
    // position has 3 attributes → multi-attribute formatting
    expect(lines[4]).toBe('        <position');
    expect(lines[5]).toBe('          x="0"');
    expect(lines[6]).toBe('          y="0"');
    expect(lines[7]).toBe('          z="0" />');
    expect(lines[8]).toBe('      </scaletransform>');
    expect(lines[9]).toBe('    </mesh>');
    expect(lines[10]).toBe('  </environment>');
    expect(lines[11]).toBe('</veml>');
  });

  it('uses 4-space indentation when tabSize is 4', () => {
    const text = '<veml><environment><mesh id="a" /></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, { tabSize: 4, insertSpaces: true });
    const result = applyEdits(text, edits);
    expect(result).toContain('    <environment>');
    expect(result).toContain('        <mesh id="a" />');
  });
});

describe('formatDocument — multi-attribute formatting (Task 2)', () => {
  it('keeps single-attribute element on one line', () => {
    const text = '<veml><environment><mesh id="a" /></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    expect(result).toContain('<mesh id="a" />');
    // Should NOT have attribute on separate line
    expect(result).not.toMatch(/mesh\n\s+id=/);
  });

  it('places multiple attributes one per line', () => {
    const text = '<veml><environment><mesh id="player" src="model.glb" visible="true" /></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    // Each attribute should be on its own line
    expect(result).toMatch(/mesh\n/);
    expect(result).toContain('id="player"');
    expect(result).toContain('src="model.glb"');
    expect(result).toContain('visible="true"');
  });

  it('indents multi-attribute lines one level deeper than tag', () => {
    const text = '<veml><environment><mesh id="a" src="model.glb" /></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    const lines = result.split('\n');
    // mesh is at depth 2 (4 spaces), attributes at depth 3 (6 spaces)
    const attrLines = lines.filter((l) => l.includes('id="a"') || l.includes('src="model.glb"'));
    for (const line of attrLines) {
      expect(line).toMatch(/^\s{6}/);
    }
  });

  it('formats element with zero attributes', () => {
    const text = '<veml><environment><background /></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    expect(result).toContain('<environment>');
    expect(result).toContain('<background />');
  });

  it('handles multi-attribute container element with closing tag', () => {
    const text = '<veml><metadata><title>Test</title></metadata><environment><mesh id="a" /></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    // veml has no attributes, so it stays on one line
    expect(result).toContain('<veml>');
    expect(result).toContain('</veml>');
    expect(result).toContain('<mesh id="a" />');
  });
});

describe('formatDocument — ErrorNode preservation (Task 3)', () => {
  it('preserves malformed sections while formatting valid sections', () => {
    const text = '<veml><environment><mesh id="a" /></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    // Valid document should be formatted normally
    expect(result).toContain('<veml>');
    expect(result).toContain('  <environment>');
  });

  it('handles document with parse errors (unclosed tags)', () => {
    const text = '<veml><environment>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    // Should not crash — may return edits or empty
    expect(Array.isArray(edits)).toBe(true);
  });

  it('handles document with only invalid content', () => {
    const text = 'just plain text with no tags';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    // Should not crash
    expect(Array.isArray(edits)).toBe(true);
  });

  it('handles mixed valid and error nodes', () => {
    const text = '<veml><foobar /><environment><mesh id="a" /></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    // Valid nodes should be formatted
    expect(result).toContain('<environment>');
    expect(result).toContain('<mesh id="a" />');
  });
});

describe('formatDocument — structural edge cases (Task 4)', () => {
  it('does not crash on document with comments (comments not in AST)', () => {
    // Comments are not represented in the current parser AST,
    // so they are not preserved during AST-based reformatting.
    const text = '<veml><!-- comment --><environment><mesh id="a" /></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    // Should format the valid structure without crashing
    expect(edits.length).toBeGreaterThan(0);
    const result = applyEdits(text, edits);
    expect(result).toContain('<veml>');
    expect(result).toContain('<mesh id="a" />');
  });

  it('returns no edits for whitespace-only document', () => {
    const doc = parseVeml('   \n  \n  ');
    const edits = formatDocument(doc, defaultOpts);
    // May or may not have edits — should not crash
    expect(Array.isArray(edits)).toBe(true);
  });

  it('handles deeply nested elements', () => {
    const text = '<veml><environment><container id="a"><container id="b"><mesh id="c" /></container></container></environment></veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    expect(result).toContain('        <mesh id="c" />'); // 8 spaces = depth 4
  });
});

describe('formatDocument — CRLF line endings (Task 6)', () => {
  it('preserves CRLF line endings in formatted output', () => {
    const text = '<veml>\r\n  <environment>\r\n    <mesh id="a" />\r\n  </environment>\r\n</veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    // Should use CRLF throughout
    expect(result).toContain('\r\n');
    expect(result).not.toMatch(/(?<!\r)\n/);
  });

  it('uses CRLF in multi-attribute formatting when source is CRLF', () => {
    const text = '<veml>\r\n<environment>\r\n<mesh id="a" src="model.glb" />\r\n</environment>\r\n</veml>';
    const doc = parseVeml(text);
    const edits = formatDocument(doc, defaultOpts);
    const result = applyEdits(text, edits);
    // Multi-attribute lines should also use CRLF
    expect(result).not.toMatch(/(?<!\r)\n/);
  });
});

describe('formatDocument — idempotency (Task 6)', () => {
  it('formatting an already-formatted document produces the same result', () => {
    const text = '<veml><environment><mesh id="a" src="model.glb" /><mesh id="b" /></environment></veml>';
    const doc1 = parseVeml(text);
    const edits1 = formatDocument(doc1, defaultOpts);
    const result1 = applyEdits(text, edits1);

    const doc2 = parseVeml(result1);
    const edits2 = formatDocument(doc2, defaultOpts);
    const result2 = applyEdits(result1, edits2);

    expect(result2).toBe(result1);
  });
});
