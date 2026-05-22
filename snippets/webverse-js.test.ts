import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as acorn from 'acorn';

const snippetsPath = join(__dirname, 'webverse-js.json');
const snippets: Record<string, { prefix: string; body: string[]; description: string }> =
  JSON.parse(readFileSync(snippetsPath, 'utf-8'));

const entries = Object.entries(snippets);

describe('webverse-js.json snippets', () => {
  it('has at least 10 snippets', () => {
    expect(entries.length).toBeGreaterThanOrEqual(10);
  });

  it('all snippets have unique prefixes', () => {
    const prefixes = entries.map(([, s]) => s.prefix);
    const unique = new Set(prefixes);
    expect(unique.size).toBe(prefixes.length);
  });

  it('all prefixes start with wv-', () => {
    for (const [name, snippet] of entries) {
      expect(snippet.prefix, `${name} prefix`).toMatch(/^wv-/);
    }
  });

  it('all snippets have a non-empty body', () => {
    for (const [name, snippet] of entries) {
      expect(snippet.body.length, `${name} body`).toBeGreaterThan(0);
    }
  });

  it('all snippets have a non-empty description', () => {
    for (const [name, snippet] of entries) {
      expect(snippet.description.length, `${name} description`).toBeGreaterThan(0);
    }
  });

  it('all snippet bodies produce valid JS when tab stops are stripped', () => {
    for (const [name, snippet] of entries) {
      const body = snippet.body.join('\n');
      // Strip VS Code snippet syntax: ${1:default}, ${2|a,b|}, $1, $0
      const stripped = body
        .replace(/\$\{\d+\|([^}]+)\|}/g, (_, choices) => choices.split(',')[0]) // choice: pick first
        .replace(/\$\{\d+:([^}]*)}/g, '$1') // tabstop with default
        .replace(/\$\d+/g, 'x'); // bare tabstop → placeholder

      try {
        acorn.parse(stripped, { ecmaVersion: 'latest', sourceType: 'script' });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        expect.fail(`Snippet "${name}" produces invalid JS: ${msg}\n---\n${stripped}`);
      }
    }
  });

  it('no unclosed tab stop placeholders', () => {
    for (const [name, snippet] of entries) {
      const body = snippet.body.join('\n');
      // Check for unclosed ${
      const opens = (body.match(/\$\{/g) || []).length;
      const closes = (body.match(/}/g) || []).length;
      expect(closes, `${name}: unclosed tab stops`).toBeGreaterThanOrEqual(opens);
    }
  });

  it('expected snippets are present', () => {
    const prefixes = entries.map(([, s]) => s.prefix);
    expect(prefixes).toContain('wv-entity-create');
    expect(prefixes).toContain('wv-entity-get');
    expect(prefixes).toContain('wv-input-handler');
    expect(prefixes).toContain('wv-update-loop');
    expect(prefixes).toContain('wv-http-get');
    expect(prefixes).toContain('wv-websocket');
    expect(prefixes).toContain('wv-mqtt-client');
    expect(prefixes).toContain('wv-local-storage');
    expect(prefixes).toContain('wv-light-create');
    expect(prefixes).toContain('wv-text-create');
  });
});
