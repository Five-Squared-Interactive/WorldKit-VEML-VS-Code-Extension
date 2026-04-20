import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseVeml } from '../server/src/vemlParser.js';
import { validateDocument } from '../server/src/vemlValidator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snippetsPath = resolve(__dirname, 'veml.json');
const snippets: Record<string, { prefix: string; body: string[]; description: string }> =
  JSON.parse(readFileSync(snippetsPath, 'utf-8'));

/**
 * Resolve VS Code snippet placeholders to their default values.
 * - `${1:default}` → `default`
 * - `${1|a,b,c|}` → `a` (first choice)
 * - `$1`, `$0` → empty string
 */
function resolveSnippet(body: string[]): string {
  return body
    .join('\n')
    .replace(/\$\{(\d+)\|([^}]*)\|}/g, (_m, _n, choices) => choices.split(',')[0])
    .replace(/\$\{(\d+):([^}]*)}/g, '$2')
    .replace(/\$\{\d+}/g, '')
    .replace(/\$\d+/g, '');
}

/** Wrap a resolved fragment snippet in its expected parent context. */
function wrapInContext(resolved: string, rootTag: string): string {
  // Entity types need to be inside <environment>
  const entityTypes = ['mesh', 'character', 'light', 'container', 'canvas', 'text', 'button', 'audio', 'terrain'];
  if (entityTypes.includes(rootTag)) {
    return `<veml><metadata><title>test</title></metadata><environment><background><color /></background>${resolved}</environment></veml>`;
  }
  // Transforms need to be inside an entity inside environment
  if (rootTag === 'scaletransform' || rootTag === 'sizetransform' || rootTag === 'canvastransform') {
    return `<veml><metadata><title>test</title></metadata><environment><background><color /></background><mesh id="wrap">${resolved}</mesh></environment></veml>`;
  }
  if (rootTag === 'environment') {
    return `<veml><metadata><title>test</title></metadata>${resolved}</veml>`;
  }
  if (rootTag === 'metadata') {
    return `<veml>${resolved}<environment><background><color /></background></environment></veml>`;
  }
  if (rootTag === 'background') {
    return `<veml><metadata><title>test</title></metadata><environment>${resolved}</environment></veml>`;
  }
  return resolved;
}

/** Extract the root element tag name from resolved snippet text. */
function getRootTag(resolved: string): string | undefined {
  const match = resolved.match(/^<([\w-]+)/);
  return match?.[1];
}

describe('VEML snippets', () => {
  const entries = Object.entries(snippets);

  it('has the expected number of snippets', () => {
    expect(entries).toHaveLength(10);
  });

  describe('metadata', () => {
    it.each(entries)('"%s" has veml- prefix', (_name, snippet) => {
      expect(snippet.prefix).toMatch(/^veml-/);
    });

    it.each(entries)('"%s" has non-empty description', (_name, snippet) => {
      expect(snippet.description.length).toBeGreaterThan(0);
    });

    it.each(entries)('"%s" has non-empty body', (_name, snippet) => {
      expect(snippet.body.length).toBeGreaterThan(0);
    });

    it('has unique prefixes', () => {
      const prefixes = entries.map(([, s]) => s.prefix);
      expect(new Set(prefixes).size).toBe(prefixes.length);
    });
  });

  describe('produces valid VEML', () => {
    it.each(entries)('"%s" parses without errors', (_name, snippet) => {
      const text = resolveSnippet(snippet.body);
      const doc = parseVeml(text);
      expect(doc.errors).toHaveLength(0);
    });

    it.each(entries)('"%s" validates without diagnostics', (_name, snippet) => {
      const text = resolveSnippet(snippet.body);
      const doc = parseVeml(text);
      const diagnostics = validateDocument(doc);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('contextual validity', () => {
    const fragmentEntries = entries.filter(([, s]) => {
      const root = getRootTag(resolveSnippet(s.body));
      return root !== 'veml';
    });

    it('has fragment snippets to test', () => {
      expect(fragmentEntries.length).toBeGreaterThan(0);
    });

    it.each(fragmentEntries)(
      '"%s" validates when embedded in parent context',
      (_name, snippet) => {
        const resolved = resolveSnippet(snippet.body);
        const rootTag = getRootTag(resolved);
        expect(rootTag).toBeDefined();
        const wrapped = wrapInContext(resolved, rootTag!);
        const doc = parseVeml(wrapped);
        expect(doc.errors).toHaveLength(0);
        const diagnostics = validateDocument(doc);
        expect(diagnostics).toHaveLength(0);
      },
    );
  });

  describe('placeholder quality', () => {
    const vemlEntries = entries.filter(([, s]) => resolveSnippet(s.body).includes('<veml'));
    const entityEntries = entries.filter(([, s]) => {
      const text = resolveSnippet(s.body);
      return text.includes(' id="');
    });

    it('has veml root snippets to test', () => {
      expect(vemlEntries.length).toBeGreaterThan(0);
    });

    it('has entity snippets with ids to test', () => {
      expect(entityEntries.length).toBeGreaterThan(0);
    });

    it.each(entityEntries)('"%s" includes id attribute', (_name, snippet) => {
      const text = resolveSnippet(snippet.body);
      expect(text).toMatch(/id="/);
    });
  });
});
