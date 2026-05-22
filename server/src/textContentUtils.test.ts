import { describe, it, expect } from 'vitest';
import { getTextContent, isFilePath } from './textContentUtils.js';
import { parseVeml } from './vemlParser.js';
import { visitNode, NodeKind } from '../../shared/src/index.js';
import type { VemlNode } from '../../shared/src/index.js';

/** Find the first node with the given kind in the AST. */
function findNode(doc: ReturnType<typeof parseVeml>, kind: number): VemlNode | undefined {
  let found: VemlNode | undefined;
  if (!doc.root) return undefined;
  visitNode(doc.root, {
    enter(node) {
      if (found) return false;
      if (node.kind === kind) {
        found = node;
        return false;
      }
    },
  });
  return found;
}

describe('getTextContent', () => {
  it('extracts text between opening and closing tags', () => {
    const text = '<veml><metadata><script>Scripts/index.js</script></metadata></veml>';
    const doc = parseVeml(text);
    const node = findNode(doc, NodeKind.Script)!;
    expect(node).toBeDefined();

    const content = getTextContent(node, text);
    expect(content).toBeDefined();
    expect(content!.text).toBe('Scripts/index.js');
  });

  it('trims whitespace from text content', () => {
    const text = '<veml><metadata><script>  Scripts/main.js  </script></metadata></veml>';
    const doc = parseVeml(text);
    const node = findNode(doc, NodeKind.Script)!;

    const content = getTextContent(node, text);
    expect(content).toBeDefined();
    expect(content!.text).toBe('Scripts/main.js');
  });

  it('returns undefined for self-closing tags', () => {
    const text = '<veml><metadata><script/></metadata></veml>';
    const doc = parseVeml(text);
    const node = findNode(doc, NodeKind.Script)!;

    const content = getTextContent(node, text);
    expect(content).toBeUndefined();
  });

  it('returns undefined for empty content', () => {
    const text = '<veml><metadata><script></script></metadata></veml>';
    const doc = parseVeml(text);
    const node = findNode(doc, NodeKind.Script)!;

    const content = getTextContent(node, text);
    expect(content).toBeUndefined();
  });

  it('returns undefined for whitespace-only content', () => {
    const text = '<veml><metadata><script>   </script></metadata></veml>';
    const doc = parseVeml(text);
    const node = findNode(doc, NodeKind.Script)!;

    const content = getTextContent(node, text);
    expect(content).toBeUndefined();
  });

  it('provides correct range for text content', () => {
    const text = '<veml><metadata><script>hello.js</script></metadata></veml>';
    const doc = parseVeml(text);
    const node = findNode(doc, NodeKind.Script)!;

    const content = getTextContent(node, text);
    expect(content).toBeDefined();
    // Range should cover "hello.js" text (start after >, end before </)
    expect(content!.range.start.offset).toBe(text.indexOf('>hello.js') + 1);
    expect(content!.range.end.offset).toBe(text.indexOf('</script>'));
  });

  it('handles multiline text content', () => {
    const text = '<veml><metadata><script>\nScripts/app.js\n</script></metadata></veml>';
    const doc = parseVeml(text);
    const node = findNode(doc, NodeKind.Script)!;

    const content = getTextContent(node, text);
    expect(content).toBeDefined();
    expect(content!.text).toBe('Scripts/app.js');
  });
});

describe('isFilePath', () => {
  it('returns true for simple .js path', () => {
    expect(isFilePath('Scripts/index.js')).toBe(true);
  });

  it('returns true for relative path with ../', () => {
    expect(isFilePath('../shared/utils.js')).toBe(true);
  });

  it('returns true for .JS (case-insensitive)', () => {
    expect(isFilePath('Main.JS')).toBe(true);
  });

  it('returns false for non-.js extension', () => {
    expect(isFilePath('styles.css')).toBe(false);
  });

  it('returns false for inline JS with semicolons', () => {
    expect(isFilePath('console.log("hi");')).toBe(false);
  });

  it('returns false for inline JS with curly braces', () => {
    expect(isFilePath('function foo() { return 1; }')).toBe(false);
  });

  it('returns false for inline JS with parentheses', () => {
    expect(isFilePath('alert("hello")')).toBe(false);
  });

  it('returns false for text with newlines', () => {
    expect(isFilePath('line1\nline2.js')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isFilePath('')).toBe(false);
  });

  it('returns true for bare filename', () => {
    expect(isFilePath('main.js')).toBe(true);
  });

  it('handles whitespace padding', () => {
    expect(isFilePath('  path/to/file.js  ')).toBe(true);
  });
});
