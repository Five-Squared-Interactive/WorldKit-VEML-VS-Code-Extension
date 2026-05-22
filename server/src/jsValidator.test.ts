import { describe, it, expect } from 'vitest';
import { validateJsFile } from './jsValidator.js';

describe('validateJsFile', () => {
  // ── Valid code — no diagnostics ─────────────────────────────────

  it('produces no diagnostics for valid Entity.Get()', () => {
    const diags = validateJsFile('Entity.Get("hero");', 'file:///a.js');
    expect(diags).toHaveLength(0);
  });

  it('produces no diagnostics for valid new Vector3(x, y, z)', () => {
    const diags = validateJsFile('new Vector3(1, 2, 3);', 'file:///a.js');
    expect(diags).toHaveLength(0);
  });

  it('produces no diagnostics for zero-arg Vector3 constructor', () => {
    const diags = validateJsFile('new Vector3();', 'file:///a.js');
    // Vector3 has 0-arg and 3-arg overloads
    expect(diags.filter((d) => d.code === 'JS300')).toHaveLength(0);
  });

  it('produces no diagnostics for non-API code', () => {
    const js = `
const x = 42;
console.log(x);
function foo(a, b) { return a + b; }
`;
    const diags = validateJsFile(js, 'file:///a.js');
    expect(diags).toHaveLength(0);
  });

  // ── Unknown class (JS200) ──────────────────────────────────────

  // Note: JS200 is not emitted because we only validate classes that ARE known.
  // Unknown identifiers like "Entityy" are not in isKnownApiClass, so we skip them.
  // This is intentional — we don't want false positives on user-defined classes.

  // ── Unknown method (JS201) ────────────────────────────────────

  it('emits JS201 for unknown method on known class', () => {
    const diags = validateJsFile('Entity.Crate("id");', 'file:///a.js');
    const js201 = diags.filter((d) => d.code === 'JS201');
    expect(js201).toHaveLength(1);
    expect(js201[0].message).toContain('Entity.Crate');
    expect(js201[0].severity).toBe('warning');
    expect(js201[0].source).toBe('webverse-js');
  });

  it('emits JS201 for misspelled method', () => {
    const diags = validateJsFile('Camera.SetPosiiton(1, 2, 3);', 'file:///a.js');
    expect(diags.some((d) => d.code === 'JS201')).toBe(true);
  });

  // ── Wrong parameter count (JS300) ──────────────────────────────

  it('emits JS300 for wrong argument count on method call', () => {
    const diags = validateJsFile('Entity.Get();', 'file:///a.js');
    const js300 = diags.filter((d) => d.code === 'JS300');
    expect(js300).toHaveLength(1);
    expect(js300[0].message).toContain('Entity.Get');
    expect(js300[0].message).toContain('got 0');
  });

  it('emits JS300 for wrong constructor arg count', () => {
    const diags = validateJsFile('new Vector3(1, 2);', 'file:///a.js');
    const js300 = diags.filter((d) => d.code === 'JS300');
    expect(js300).toHaveLength(1);
    expect(js300[0].message).toContain('constructor');
    expect(js300[0].message).toContain('got 2');
  });

  it('accepts valid overload with different param counts', () => {
    // Color has multiple constructor overloads
    const diags1 = validateJsFile('new Color(1, 0.5, 0);', 'file:///a.js');
    const diags2 = validateJsFile('new Color(1, 0.5, 0, 1);', 'file:///a.js');
    expect(diags1.filter((d) => d.code === 'JS300')).toHaveLength(0);
    expect(diags2.filter((d) => d.code === 'JS300')).toHaveLength(0);
  });

  // ── Conditional API (JS202) ────────────────────────────────────

  it('emits JS202 for conditional API usage', () => {
    const diags = validateJsFile('WorldSync.Connect("host", 1883);', 'file:///a.js');
    const js202 = diags.filter((d) => d.code === 'JS202');
    expect(js202).toHaveLength(1);
    expect(js202[0].severity).toBe('info');
    expect(js202[0].message).toContain('WorldSync');
  });

  // ── Chained calls ──────────────────────────────────────────────

  it('validates first call in chain, skips chained methods', () => {
    // Entity.Get() is the first call (Identifier.method), second .SetPosition() has CallExpression as object
    const diags = validateJsFile('Entity.Get("id").SetPosition(new Vector3(0,1,0));', 'file:///a.js');
    // Should validate Entity.Get("id") — 1 param is correct
    // Should NOT validate .SetPosition() — callee.object is CallExpression, not Identifier
    expect(diags.filter((d) => d.code === 'JS201')).toHaveLength(0);
    expect(diags.filter((d) => d.code === 'JS300')).toHaveLength(0);
  });

  // ── Parse error (JS302) ────────────────────────────────────────

  it('emits JS302 for syntax errors', () => {
    const diags = validateJsFile('function { broken', 'file:///project/bad.js');
    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe('JS302');
    expect(diags[0].severity).toBe('info');
    expect(diags[0].message).toContain('bad.js');
  });

  // ── Non-constructable class ────────────────────────────────────

  it('emits JS201 for new on non-constructable class', () => {
    const diags = validateJsFile('new Camera();', 'file:///a.js');
    const js201 = diags.filter((d) => d.code === 'JS201');
    expect(js201).toHaveLength(1);
    expect(js201[0].message).toContain('Camera');
    expect(js201[0].message).toContain('constructor');
  });

  // ── Edge cases ─────────────────────────────────────────────────

  it('handles empty file', () => {
    const diags = validateJsFile('', 'file:///empty.js');
    expect(diags).toHaveLength(0);
  });

  it('handles file with only comments', () => {
    const diags = validateJsFile('// just a comment\n/* block */\n', 'file:///a.js');
    expect(diags).toHaveLength(0);
  });

  it('stops after MAX_CALLS (1000)', () => {
    // Generate 1100 call expressions
    const calls = Array.from({ length: 1100 }, (_, i) => `Entity.Get("e${i}");`).join('\n');
    const diags = validateJsFile(calls, 'file:///big.js');
    // Should not hang — all calls are valid so 0 diagnostics
    expect(diags).toHaveLength(0);
  });

  // ── Multiple diagnostics ───────────────────────────────────────

  it('reports multiple errors in the same file', () => {
    const js = `
Entity.Crate("id");
Entity.Get();
`;
    const diags = validateJsFile(js, 'file:///a.js');
    expect(diags.length).toBeGreaterThanOrEqual(2);
    expect(diags.some((d) => d.code === 'JS201')).toBe(true);
    expect(diags.some((d) => d.code === 'JS300')).toBe(true);
  });

  // ── Source field ───────────────────────────────────────────────

  it('sets source to webverse-js for API diagnostics', () => {
    const diags = validateJsFile('Entity.Crate("x");', 'file:///a.js');
    expect(diags[0].source).toBe('webverse-js');
  });
});
