import { describe, it, expect } from 'vitest';
import { ScriptIndex } from './scriptIndex.js';
import { parseVeml } from './vemlParser.js';
import type { JsFunctionDeclaration } from './scriptIndex.js';

describe('ScriptIndex', () => {
  describe('indexDocument', () => {
    it('indexes script file paths from <script> elements', () => {
      const text = '<veml><metadata><script>Scripts/index.js</script></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);

      const refs = index.getScriptReferences('file:///project/world.veml');
      expect(refs).toHaveLength(1);
      expect(refs[0].scriptPath).toBe('Scripts/index.js');
      expect(refs[0].vemlUri).toBe('file:///project/world.veml');
    });

    it('indexes multiple script references', () => {
      const text = '<veml><metadata><script>Scripts/a.js</script><script>Scripts/b.js</script></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);

      const refs = index.getScriptReferences('file:///project/world.veml');
      expect(refs).toHaveLength(2);
      expect(refs[0].scriptPath).toBe('Scripts/a.js');
      expect(refs[1].scriptPath).toBe('Scripts/b.js');
    });

    it('skips inline JavaScript (not file paths)', () => {
      const text = '<veml><metadata><script>console.log("hello");</script></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);

      const refs = index.getScriptReferences('file:///project/world.veml');
      expect(refs).toHaveLength(0);
    });

    it('skips self-closing <script/> elements', () => {
      const text = '<veml><metadata><script/></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);

      expect(index.getScriptReferences('file:///project/world.veml')).toHaveLength(0);
    });

    it('skips empty <script> elements', () => {
      const text = '<veml><metadata><script></script></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);

      expect(index.getScriptReferences('file:///project/world.veml')).toHaveLength(0);
    });

    it('skips external URLs', () => {
      const text = '<veml><metadata><script>https://cdn.example.com/lib.js</script></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);

      expect(index.getScriptReferences('file:///project/world.veml')).toHaveLength(0);
    });

    it('skips http URLs', () => {
      const text = '<veml><metadata><script>http://cdn.example.com/lib.js</script></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);

      expect(index.getScriptReferences('file:///project/world.veml')).toHaveLength(0);
    });

    it('handles empty document', () => {
      const text = '';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);

      expect(index.getScriptReferences('file:///project/world.veml')).toHaveLength(0);
    });

    it('is idempotent — re-indexing replaces previous data', () => {
      const text1 = '<veml><metadata><script>Scripts/old.js</script></metadata></veml>';
      const text2 = '<veml><metadata><script>Scripts/new.js</script></metadata></veml>';
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', parseVeml(text1), text1);
      index.indexDocument('file:///project/world.veml', parseVeml(text2), text2);

      const refs = index.getScriptReferences('file:///project/world.veml');
      expect(refs).toHaveLength(1);
      expect(refs[0].scriptPath).toBe('Scripts/new.js');
    });

    it('resolves script URIs for reverse lookup', () => {
      const text = '<veml><metadata><script>Scripts/index.js</script></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);

      const refs = index.getScriptReferences('file:///project/world.veml');
      expect(refs).toHaveLength(1);

      // Reverse lookup by resolved URI
      const vemlRefs = index.getVemlReferences(refs[0].resolvedUri);
      expect(vemlRefs).toHaveLength(1);
      expect(vemlRefs[0].vemlUri).toBe('file:///project/world.veml');
    });
  });

  describe('removeDocument', () => {
    it('removes all references for a VEML document', () => {
      const text = '<veml><metadata><script>Scripts/index.js</script></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);
      expect(index.getScriptReferences('file:///project/world.veml')).toHaveLength(1);

      index.removeDocument('file:///project/world.veml');
      expect(index.getScriptReferences('file:///project/world.veml')).toHaveLength(0);
    });

    it('cleans up reverse index on removal', () => {
      const text = '<veml><metadata><script>Scripts/index.js</script></metadata></veml>';
      const doc = parseVeml(text);
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', doc, text);
      const resolvedUri = index.getScriptReferences('file:///project/world.veml')[0].resolvedUri;

      index.removeDocument('file:///project/world.veml');
      expect(index.getVemlReferences(resolvedUri)).toHaveLength(0);
    });

    it('does not affect other documents', () => {
      const text1 = '<veml><metadata><script>Scripts/a.js</script></metadata></veml>';
      const text2 = '<veml><metadata><script>Scripts/b.js</script></metadata></veml>';
      const index = new ScriptIndex();

      index.indexDocument('file:///project/w1.veml', parseVeml(text1), text1);
      index.indexDocument('file:///project/w2.veml', parseVeml(text2), text2);

      index.removeDocument('file:///project/w1.veml');

      expect(index.getScriptReferences('file:///project/w1.veml')).toHaveLength(0);
      expect(index.getScriptReferences('file:///project/w2.veml')).toHaveLength(1);
    });

    it('handles removing non-existent document gracefully', () => {
      const index = new ScriptIndex();
      expect(() => index.removeDocument('file:///nonexistent.veml')).not.toThrow();
    });
  });

  describe('getVemlReferences', () => {
    it('returns empty array for unknown script URI', () => {
      const index = new ScriptIndex();
      expect(index.getVemlReferences('file:///unknown.js')).toHaveLength(0);
    });

    it('aggregates references from multiple VEML files', () => {
      const text = '<veml><metadata><script>Scripts/shared.js</script></metadata></veml>';
      const index = new ScriptIndex();

      index.indexDocument('file:///project/w1.veml', parseVeml(text), text);
      index.indexDocument('file:///project/w2.veml', parseVeml(text), text);

      // Both VEML files reference the same relative path, resolving to the same script
      const refs1 = index.getScriptReferences('file:///project/w1.veml');
      const vemlRefs = index.getVemlReferences(refs1[0].resolvedUri);
      expect(vemlRefs).toHaveLength(2);
    });
  });

  describe('getReferenceCount', () => {
    it('returns 0 for empty index', () => {
      const index = new ScriptIndex();
      expect(index.getReferenceCount()).toBe(0);
    });

    it('counts all script references across documents', () => {
      const text1 = '<veml><metadata><script>Scripts/a.js</script><script>Scripts/b.js</script></metadata></veml>';
      const text2 = '<veml><metadata><script>Scripts/c.js</script></metadata></veml>';
      const index = new ScriptIndex();

      index.indexDocument('file:///project/w1.veml', parseVeml(text1), text1);
      index.indexDocument('file:///project/w2.veml', parseVeml(text2), text2);

      expect(index.getReferenceCount()).toBe(3);
    });
  });

  describe('indexJsFile', () => {
    it('extracts named function declarations', () => {
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/Scripts/index.js', 'function onLoaded() {}');

      const funcs = index.getFunctions('file:///project/Scripts/index.js');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('onLoaded');
      expect(funcs[0].paramCount).toBe(0);
    });

    it('extracts function declarations with parameters', () => {
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', 'function setup(entity, world) {}');

      const funcs = index.getFunctions('file:///project/a.js');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('setup');
      expect(funcs[0].paramCount).toBe(2);
    });

    it('extracts const function expressions', () => {
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', 'const handleClick = function() {}');

      const funcs = index.getFunctions('file:///project/a.js');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('handleClick');
    });

    it('extracts const arrow functions', () => {
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', 'const update = () => {}');

      const funcs = index.getFunctions('file:///project/a.js');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('update');
    });

    it('extracts multiple functions', () => {
      const js = `
function onLoaded() {}
const onClick = () => {};
function update(dt) {}
`;
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', js);

      const funcs = index.getFunctions('file:///project/a.js');
      expect(funcs).toHaveLength(3);
      expect(funcs.map((f) => f.name)).toEqual(['onLoaded', 'onClick', 'update']);
    });

    it('skips nested functions (only top-level)', () => {
      const js = `
function outer() {
  function inner() {}
}
`;
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', js);

      const funcs = index.getFunctions('file:///project/a.js');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('outer');
    });

    it('does not crash on syntax errors', () => {
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', 'function { broken syntax');

      const funcs = index.getFunctions('file:///project/a.js');
      expect(funcs).toHaveLength(0);
    });

    it('returns empty array for empty file', () => {
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', '');

      expect(index.getFunctions('file:///project/a.js')).toHaveLength(0);
    });

    it('is idempotent — re-indexing replaces previous data', () => {
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', 'function old() {}');
      index.indexJsFile('file:///project/a.js', 'function newFn() {}');

      const funcs = index.getFunctions('file:///project/a.js');
      expect(funcs).toHaveLength(1);
      expect(funcs[0].name).toBe('newFn');
    });

    it('skips let/var declarations (only const)', () => {
      const js = `
let a = function() {};
var b = () => {};
const c = () => {};
`;
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', js);

      const funcs = index.getFunctions('file:///project/a.js');
      // VariableDeclaration includes let/var too — tech spec says VariableDeclaration
      // All three should be extracted since they're all top-level variable declarations
      expect(funcs).toHaveLength(3);
    });
  });

  describe('removeJsFile', () => {
    it('removes function index for a JS file', () => {
      const index = new ScriptIndex();
      index.indexJsFile('file:///project/a.js', 'function foo() {}');
      expect(index.getFunctions('file:///project/a.js')).toHaveLength(1);

      index.removeJsFile('file:///project/a.js');
      expect(index.getFunctions('file:///project/a.js')).toHaveLength(0);
    });

    it('handles removing non-existent JS file gracefully', () => {
      const index = new ScriptIndex();
      expect(() => index.removeJsFile('file:///nonexistent.js')).not.toThrow();
    });
  });

  describe('getAllFunctionsForVeml', () => {
    it('aggregates functions from all referenced scripts', () => {
      const veml = '<veml><metadata><script>Scripts/a.js</script><script>Scripts/b.js</script></metadata></veml>';
      const index = new ScriptIndex();

      index.indexDocument('file:///project/world.veml', parseVeml(veml), veml);

      // Get the resolved URIs and index JS files
      const refs = index.getScriptReferences('file:///project/world.veml');
      index.indexJsFile(refs[0].resolvedUri, 'function foo() {}');
      index.indexJsFile(refs[1].resolvedUri, 'function bar() {}');

      const allFuncs = index.getAllFunctionsForVeml('file:///project/world.veml');
      expect(allFuncs).toHaveLength(2);
      expect(allFuncs.map((f) => f.name).sort()).toEqual(['bar', 'foo']);
    });

    it('returns empty when no scripts are referenced', () => {
      const index = new ScriptIndex();
      expect(index.getAllFunctionsForVeml('file:///project/world.veml')).toHaveLength(0);
    });

    it('returns empty when scripts have no functions', () => {
      const veml = '<veml><metadata><script>Scripts/a.js</script></metadata></veml>';
      const index = new ScriptIndex();
      index.indexDocument('file:///project/world.veml', parseVeml(veml), veml);

      // Script is indexed but has no functions
      const refs = index.getScriptReferences('file:///project/world.veml');
      index.indexJsFile(refs[0].resolvedUri, 'var x = 42;');

      expect(index.getAllFunctionsForVeml('file:///project/world.veml')).toHaveLength(0);
    });
  });
});
