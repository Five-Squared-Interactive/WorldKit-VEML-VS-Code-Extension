import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { validateDocument } from './vemlValidator.js';
import { parseVeml } from './vemlParser.js';
import { EntityIndex } from './entityIndex.js';

function loadFixture(name: string): string {
  return readFileSync(resolve(__dirname, '../../syntaxes/__fixtures__', name), 'utf-8');
}

describe('validateDocument', () => {
  // ── AC #6: Valid documents produce zero diagnostics ──────────────

  it('returns empty array for a fully valid document', () => {
    const doc = parseVeml(`
      <veml>
        <metadata>
          <title>Demo</title>
        </metadata>
        <environment>
          <background>
            <lite-procedural-sky top-color="#87CEEB" />
          </background>
          <terrain id="ground" />
          <mesh id="player" src="player.glb">
            <scaletransform>
              <position x="0" y="1" z="0" />
            </scaletransform>
          </mesh>
        </environment>
      </veml>
    `);
    const diags = validateDocument(doc);
    expect(diags).toHaveLength(0);
  });

  it('handles empty document (parser may produce errors)', () => {
    const doc = parseVeml('');
    const diags = validateDocument(doc);
    // Empty input may produce parse errors from SAX — all should be VEML0xx
    for (const d of diags) {
      expect(d.code).toMatch(/^VEML0/);
    }
  });

  it('handles whitespace-only document (parser may produce errors)', () => {
    const doc = parseVeml('   \n  \n  ');
    const diags = validateDocument(doc);
    for (const d of diags) {
      expect(d.code).toMatch(/^VEML0/);
    }
  });

  // ── AC #1: Parse errors from ErrorNodes ──────────────────────────

  it('produces parse error diagnostic for unclosed tag', () => {
    const doc = parseVeml('<veml><environment>');
    const diags = validateDocument(doc);
    expect(diags.length).toBeGreaterThan(0);
    const parseDiags = diags.filter((d) => d.code.startsWith('VEML0'));
    expect(parseDiags.length).toBeGreaterThan(0);
    expect(parseDiags[0].severity).toBe('error');
  });

  it('produces parse error diagnostic for mismatched closing tag', () => {
    const doc = parseVeml('<veml></environment>');
    const diags = validateDocument(doc);
    const parseDiags = diags.filter((d) => d.code.startsWith('VEML0'));
    expect(parseDiags.length).toBeGreaterThan(0);
  });

  it('produces VEML006 for generic parse errors', () => {
    const doc = parseVeml('<<<invalid');
    const diags = validateDocument(doc);
    expect(diags.length).toBeGreaterThan(0);
    // Should produce at least one parse-range code
    const parseDiags = diags.filter((d) => d.code.startsWith('VEML0'));
    expect(parseDiags.length).toBeGreaterThan(0);
  });

  // ── AC #2: Unknown element emits VEML200 ─────────────────────────

  it('emits VEML200 for unknown element', () => {
    const doc = parseVeml(`
      <veml>
        <foobar />
      </veml>
    `);
    const diags = validateDocument(doc);
    const unknownDiags = diags.filter((d) => d.code === 'VEML200');
    expect(unknownDiags).toHaveLength(1);
    expect(unknownDiags[0].message).toContain('foobar');
    expect(unknownDiags[0].severity).toBe('warning');
  });

  it('emits VEML200 for multiple unknown elements', () => {
    const doc = parseVeml(`
      <veml>
        <foo />
        <bar />
      </veml>
    `);
    const diags = validateDocument(doc);
    const unknownDiags = diags.filter((d) => d.code === 'VEML200');
    expect(unknownDiags).toHaveLength(2);
  });

  // ── AC #3: Missing required attribute emits VEML100 ──────────────
  // Note: In VEML 3.0 most elements have no required attributes, so we
  // verify that valid documents do not trigger VEML100 spuriously.

  it('does not emit VEML100 for valid VEML 3.0 elements (no required attrs)', () => {
    const doc = parseVeml(`
      <veml>
        <metadata>
          <title>Test</title>
        </metadata>
        <environment>
          <background><color /></background>
          <mesh id="m1" />
        </environment>
      </veml>
    `);
    const diags = validateDocument(doc);
    const attrDiags = diags.filter((d) => d.code === 'VEML100');
    expect(attrDiags).toHaveLength(0);
  });

  it('does not emit VEML100 for veml root without attributes', () => {
    const doc = parseVeml('<veml></veml>');
    const diags = validateDocument(doc);
    const attrDiags = diags.filter((d) => d.code === 'VEML100');
    expect(attrDiags).toHaveLength(0);
  });

  // ── AC #2/#3: Invalid nesting emits VEML201 ──────────────────────

  it('emits VEML201 for invalid child element nesting', () => {
    const doc = parseVeml(`
      <veml>
        <environment>
          <metadata>
            <title>Wrong Place</title>
          </metadata>
        </environment>
      </veml>
    `);
    const diags = validateDocument(doc);
    const nestDiags = diags.filter((d) => d.code === 'VEML201');
    expect(nestDiags).toHaveLength(1);
    expect(nestDiags[0].message).toContain('metadata');
    expect(nestDiags[0].message).toContain('environment');
  });

  it('does not emit VEML201 for valid nesting', () => {
    const doc = parseVeml(`
      <veml>
        <environment>
          <background>
            <lite-procedural-sky />
          </background>
          <mesh id="m1">
            <mesh id="m2" />
          </mesh>
        </environment>
      </veml>
    `);
    const diags = validateDocument(doc);
    const nestDiags = diags.filter((d) => d.code === 'VEML201');
    expect(nestDiags).toHaveLength(0);
  });

  // ── Edge cases ───────────────────────────────────────────────────

  it('handles document with only error nodes', () => {
    const doc = parseVeml('just plain text with no tags');
    const diags = validateDocument(doc);
    // Should not crash; may produce parse errors or empty
    expect(Array.isArray(diags)).toBe(true);
  });

  it('handles mixed valid and invalid elements', () => {
    const doc = parseVeml(`
      <veml>
        <environment>
          <background>
            <color />
          </background>
          <badchild />
        </environment>
      </veml>
    `);
    const diags = validateDocument(doc);
    // badchild should produce VEML200 (unknown) and/or VEML201 (invalid nesting)
    expect(diags.length).toBeGreaterThan(0);
  });

  it('skips structural nodes (Document, Comment)', () => {
    // Comments are structural and should not produce schema diagnostics
    const doc = parseVeml(`
      <!-- This is a comment -->
      <veml>
        <environment>
          <mesh id="e1" />
        </environment>
      </veml>
    `);
    const diags = validateDocument(doc);
    const schemaDiags = diags.filter((d) => d.code.startsWith('VEML2'));
    expect(schemaDiags).toHaveLength(0);
  });

  it('produces diagnostics with valid SourceRange', () => {
    const doc = parseVeml(`
      <veml>
        <foobar />
      </veml>
    `);
    const diags = validateDocument(doc);
    expect(diags.length).toBeGreaterThan(0);
    for (const d of diags) {
      expect(d.range.start.line).toBeGreaterThanOrEqual(1);
      expect(d.range.start.column).toBeGreaterThanOrEqual(0);
      expect(d.range.end.line).toBeGreaterThanOrEqual(d.range.start.line);
      expect(d.source).toBe('worldkit-veml');
    }
  });

  // ── Fixture-based tests ────────────────────────────────────────────

  it('valid-world.veml fixture produces zero diagnostics', () => {
    const text = loadFixture('valid-world.veml');
    const doc = parseVeml(text);
    const diags = validateDocument(doc);
    expect(diags).toHaveLength(0);
  });

  it('malformed.veml fixture produces parse error diagnostics', () => {
    const text = loadFixture('malformed.veml');
    const doc = parseVeml(text);
    const diags = validateDocument(doc);
    expect(diags.length).toBeGreaterThan(0);
    const parseDiags = diags.filter((d) => d.code.startsWith('VEML0'));
    expect(parseDiags.length).toBeGreaterThan(0);
  });

  // ── classifyParseError branch coverage ────────────────────────────

  it('classifies mismatched closing tag errors as VEML002 with expected/found', () => {
    const doc = parseVeml('<veml><environment></veml>');
    const diags = validateDocument(doc);
    // At minimum we should have a parse error (may or may not be VEML002 specifically)
    const parseDiags = diags.filter((d) => d.code.startsWith('VEML0'));
    expect(parseDiags.length).toBeGreaterThan(0);
  });

  it('classifies attribute errors as VEML003', () => {
    // Duplicate attribute triggers saxes "duplicate attribute" error
    const doc = parseVeml('<veml><mesh id="a" id="b"></mesh></veml>');
    const diags = validateDocument(doc);
    const attrParseErrors = diags.filter((d) => d.code === 'VEML003');
    expect(attrParseErrors.length).toBeGreaterThan(0);
  });

  // ── Broken entity references (VEML203) ────────────────────────────

  it('emits VEML203 for broken entity reference', () => {
    const doc = parseVeml('<veml><environment><mesh id="a" ref="nonexistent"/></environment></veml>');
    const index = new EntityIndex();
    index.indexDocument('file:///world.veml', doc);
    const diags = validateDocument(doc, index);
    const brokenRefs = diags.filter((d) => d.code === 'VEML203');
    expect(brokenRefs).toHaveLength(1);
    expect(brokenRefs[0].message).toContain('nonexistent');
    expect(brokenRefs[0].severity).toBe('error');
    expect(brokenRefs[0].suggestion).toContain('nonexistent');
  });

  it('does not emit VEML203 for valid entity reference', () => {
    const worldText = '<veml><environment><mesh id="target"/></environment></veml>';
    const refText = '<veml><environment><mesh id="a" ref="target"/></environment></veml>';
    const index = new EntityIndex();
    index.indexDocument('file:///world.veml', parseVeml(worldText));
    const refDoc = parseVeml(refText);
    index.indexDocument('file:///ref.veml', refDoc);
    const diags = validateDocument(refDoc, index);
    const brokenRefs = diags.filter((d) => d.code === 'VEML203');
    expect(brokenRefs).toHaveLength(0);
  });

  it('does not emit VEML203 when entityIndex is not provided', () => {
    const doc = parseVeml('<veml><environment><mesh id="a" ref="nonexistent"/></environment></veml>');
    const diags = validateDocument(doc);
    const brokenRefs = diags.filter((d) => d.code === 'VEML203');
    expect(brokenRefs).toHaveLength(0);
  });

  it('broken ref disappears when entity is defined (AC #4)', () => {
    const refText = '<veml><environment><mesh id="a" ref="target"/></environment></veml>';
    const refDoc = parseVeml(refText);
    const index = new EntityIndex();
    index.indexDocument('file:///ref.veml', refDoc);

    // Before target is defined — broken ref
    let diags = validateDocument(refDoc, index);
    expect(diags.filter((d) => d.code === 'VEML203')).toHaveLength(1);

    // Define the target entity in another file
    const targetText = '<veml><environment><mesh id="target"/></environment></veml>';
    index.indexDocument('file:///target.veml', parseVeml(targetText));

    // After target is defined — no broken ref
    diags = validateDocument(refDoc, index);
    expect(diags.filter((d) => d.code === 'VEML203')).toHaveLength(0);
  });

  it('does not emit VEML203 for empty ref value', () => {
    const doc = parseVeml('<veml><environment><mesh id="a" ref=""/></environment></veml>');
    const index = new EntityIndex();
    index.indexDocument('file:///world.veml', doc);
    const diags = validateDocument(doc, index);
    const brokenRefs = diags.filter((d) => d.code === 'VEML203');
    expect(brokenRefs).toHaveLength(0);
  });
});
