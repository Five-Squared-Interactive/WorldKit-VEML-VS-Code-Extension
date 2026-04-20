import { describe, it, expect, beforeAll } from 'vitest';
import * as vsctm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';
import * as fs from 'node:fs';
import * as path from 'node:path';

const projectRoot = path.resolve(__dirname, '..');
let grammar: vsctm.IGrammar;

/**
 * Helper to tokenize a single line and return its tokens' scopes.
 */
function tokenizeLine(line: string, ruleStack: vsctm.StateStack = vsctm.INITIAL) {
  const result = grammar.tokenizeLine(line, ruleStack);
  return {
    tokens: result.tokens.map((t) => ({
      text: line.substring(t.startIndex, t.endIndex),
      scopes: t.scopes,
    })),
    ruleStack: result.ruleStack,
  };
}

/**
 * Helper to find a token containing a specific scope.
 */
function findTokenWithScope(line: string, scope: string) {
  const { tokens } = tokenizeLine(line);
  return tokens.filter((t) => t.scopes.some((s) => s.includes(scope)));
}

/**
 * Helper to tokenize multiple lines and return all token data.
 */
function tokenizeLines(lines: string[]) {
  let ruleStack = vsctm.INITIAL;
  const results: { line: string; tokens: { text: string; scopes: string[] }[] }[] = [];
  for (const line of lines) {
    const result = tokenizeLine(line, ruleStack);
    results.push({ line, tokens: result.tokens });
    ruleStack = result.ruleStack;
  }
  return results;
}

beforeAll(async () => {
  const wasmBin = fs.readFileSync(
    path.join(projectRoot, 'node_modules/vscode-oniguruma/release/onig.wasm'),
  ).buffer;

  const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => ({
    createOnigScanner(patterns: string[]) {
      return new oniguruma.OnigScanner(patterns);
    },
    createOnigString(s: string) {
      return new oniguruma.OnigString(s);
    },
  }));

  const registry = new vsctm.Registry({
    onigLib: vscodeOnigurumaLib,
    loadGrammar: (scopeName: string) => {
      if (scopeName === 'text.xml.veml') {
        const content = fs.readFileSync(
          path.join(projectRoot, 'syntaxes/veml.tmLanguage.json'),
          'utf8',
        );
        return vsctm.parseRawGrammar(content, 'veml.tmLanguage.json') as ReturnType<typeof vsctm.parseRawGrammar>;
      }
      return null as unknown as ReturnType<typeof vsctm.parseRawGrammar>;
    },
  });

  const g = await registry.loadGrammar('text.xml.veml');
  if (!g) throw new Error('Failed to load grammar');
  grammar = g;
});

describe('TextMate Grammar: XML Structural Scopes', () => {
  it('assigns comment.block.veml to XML comments', () => {
    const tokens = findTokenWithScope('<!-- a comment -->', 'comment.block.veml');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('assigns punctuation.definition.comment.veml to comment delimiters', () => {
    const tokens = findTokenWithScope('<!-- text -->', 'punctuation.definition.comment.veml');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].text).toBe('<!--');
  });

  it('assigns string.unquoted.cdata.veml to CDATA sections', () => {
    const results = tokenizeLines(['<![CDATA[some raw data]]>']);
    const cdataTokens = results[0].tokens.filter((t) =>
      t.scopes.some((s) => s.includes('string.unquoted.cdata.veml')),
    );
    expect(cdataTokens.length).toBeGreaterThan(0);
  });

  it('assigns meta.tag.preprocessor.veml to processing instructions', () => {
    const tokens = findTokenWithScope('<?xml version="1.0"?>', 'meta.tag.preprocessor.veml');
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('assigns meta.tag.sgml.doctype.veml to DOCTYPE declarations', () => {
    const tokens = findTokenWithScope('<!DOCTYPE veml>', 'meta.tag.sgml.doctype.veml');
    expect(tokens.length).toBeGreaterThan(0);
    const keyword = findTokenWithScope('<!DOCTYPE veml>', 'keyword.other.doctype.veml');
    expect(keyword.length).toBe(1);
    expect(keyword[0].text).toBe('DOCTYPE');
  });

  it('assigns constant.character.entity.veml to entity references', () => {
    const { tokens } = tokenizeLine('&amp;');
    const entityTokens = tokens.filter((t) =>
      t.scopes.some((s) => s.includes('constant.character.entity.veml')),
    );
    expect(entityTokens.length).toBeGreaterThan(0);
    expect(entityTokens[0].text).toBe('amp');
  });

  it('assigns invalid.illegal.bad-ampersand.veml to bare ampersands', () => {
    const { tokens } = tokenizeLine('Tom & Jerry');
    const invalidTokens = tokens.filter((t) =>
      t.scopes.some((s) => s.includes('invalid.illegal.bad-ampersand.veml')),
    );
    expect(invalidTokens.length).toBeGreaterThan(0);
  });
});

describe('TextMate Grammar: Tag Scopes', () => {
  it('assigns punctuation.definition.tag.veml to angle brackets', () => {
    const tokens = findTokenWithScope('<veml>', 'punctuation.definition.tag.veml');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].text).toBe('<');
  });

  it('assigns entity.other.attribute-name.veml to attribute names', () => {
    const tokens = findTokenWithScope('<mesh id="test">', 'entity.other.attribute-name.veml');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].text).toBe('id');
  });

  it('assigns string.quoted.double.veml to double-quoted attribute values', () => {
    const tokens = findTokenWithScope('<mesh id="test">', 'string.quoted.double.veml');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].text).toBe('test');
  });

  it('assigns string.quoted.single.veml to single-quoted attribute values', () => {
    const tokens = findTokenWithScope("<mesh id='test'>", 'string.quoted.single.veml');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0].text).toBe('test');
  });

  it('assigns punctuation.definition.string scopes to string delimiters', () => {
    const beginTokens = findTokenWithScope('<mesh id="test">', 'punctuation.definition.string.begin.veml');
    const endTokens = findTokenWithScope('<mesh id="test">', 'punctuation.definition.string.end.veml');
    expect(beginTokens.length).toBeGreaterThan(0);
    expect(endTokens.length).toBeGreaterThan(0);
  });

  it('handles self-closing tags', () => {
    const tokens = findTokenWithScope('<position />', 'punctuation.definition.tag.veml');
    expect(tokens.length).toBeGreaterThan(0);
    const closingSlash = tokens.find((t) => t.text === '/>');
    expect(closingSlash).toBeDefined();
  });

  it('assigns correct scopes to closing tags', () => {
    const tokens = findTokenWithScope('</mesh>', 'punctuation.definition.tag.veml');
    expect(tokens.length).toBe(2); // </ and >
    expect(tokens[0].text).toBe('</');
    expect(tokens[1].text).toBe('>');
  });
});

describe('TextMate Grammar: VEML-Specific Element Scopes', () => {
  describe('Structure category elements', () => {
    for (const tag of ['veml', 'metadata', 'environment', 'background', 'effects']) {
      it(`assigns entity.name.tag.structure.world.veml to <${tag}>`, () => {
        const tokens = findTokenWithScope(`<${tag}>`, 'entity.name.tag.structure.world.veml');
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[0].text).toBe(tag);
      });

      it(`assigns entity.name.tag.structure.world.veml to </${tag}>`, () => {
        const tokens = findTokenWithScope(`</${tag}>`, 'entity.name.tag.structure.world.veml');
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[0].text).toBe(tag);
      });

      it(`wraps <${tag}> in meta.tag.structure.world.veml`, () => {
        const { tokens } = tokenizeLine(`<${tag}>`);
        const hasMetaScope = tokens.some((t) =>
          t.scopes.some((s) => s.includes('meta.tag.structure.world.veml')),
        );
        expect(hasMetaScope).toBe(true);
      });
    }
  });

  describe('Entity category elements', () => {
    for (const tag of ['container', 'mesh', 'light', 'character', 'audio', 'terrain', 'canvas', 'text']) {
      it(`assigns entity.name.tag.structure.entity.veml to <${tag}>`, () => {
        const tokens = findTokenWithScope(`<${tag}>`, 'entity.name.tag.structure.entity.veml');
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[0].text).toBe(tag);
      });

      it(`assigns entity.name.tag.structure.entity.veml to </${tag}>`, () => {
        const tokens = findTokenWithScope(`</${tag}>`, 'entity.name.tag.structure.entity.veml');
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[0].text).toBe(tag);
      });
    }
  });

  describe('Transform/component category elements', () => {
    for (const tag of ['scaletransform', 'sizetransform', 'canvastransform', 'position', 'rotation', 'scale', 'synchronizer']) {
      it(`assigns entity.name.tag.component.veml to <${tag}>`, () => {
        const tokens = findTokenWithScope(`<${tag}>`, 'entity.name.tag.component.veml');
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[0].text).toBe(tag);
      });

      it(`assigns entity.name.tag.component.veml to </${tag}>`, () => {
        const tokens = findTokenWithScope(`</${tag}>`, 'entity.name.tag.component.veml');
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[0].text).toBe(tag);
      });
    }
  });

  describe('Metadata/background child elements', () => {
    for (const tag of ['title', 'capability', 'script', 'panorama', 'color', 'lite-procedural-sky', 'lite-fog']) {
      it(`assigns entity.name.tag.ui.veml to <${tag}>`, () => {
        const tokens = findTokenWithScope(`<${tag}>`, 'entity.name.tag.ui.veml');
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[0].text).toBe(tag);
      });

      it(`assigns entity.name.tag.ui.veml to </${tag}>`, () => {
        const tokens = findTokenWithScope(`</${tag}>`, 'entity.name.tag.ui.veml');
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[0].text).toBe(tag);
      });
    }
  });

  describe('Generic/unknown elements', () => {
    it('assigns entity.name.tag.localname.veml to unknown tags', () => {
      const tokens = findTokenWithScope('<unknowntag>', 'entity.name.tag.localname.veml');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].text).toBe('unknowntag');
    });

    it('wraps unknown tags in meta.tag.other.veml', () => {
      const { tokens } = tokenizeLine('<unknowntag>');
      const hasMetaScope = tokens.some((t) =>
        t.scopes.some((s) => s.includes('meta.tag.other.veml')),
      );
      expect(hasMetaScope).toBe(true);
    });
  });
});

describe('TextMate Grammar: Malformed Input Handling', () => {
  it('does not break subsequent lines when a tag is unclosed', () => {
    const results = tokenizeLines([
      '<veml>',
      '<mesh id="recovery">',
    ]);
    // The second line should still tokenize mesh tag correctly
    const meshTokens = results[1].tokens.filter((t) =>
      t.scopes.some((s) => s.includes('entity.name.tag.structure.entity.veml')),
    );
    expect(meshTokens.length).toBeGreaterThan(0);
  });

  it('marks bare ampersands as invalid inside attribute values', () => {
    const tokens = findTokenWithScope('<text content="Tom & Jerry" />', 'invalid.illegal.bad-ampersand.veml');
    expect(tokens.length).toBe(1);
    expect(tokens[0].text).toBe('&');
  });

  it('valid entity references inside values are not marked invalid', () => {
    const results = tokenizeLines(['<text content="Tom &amp; Jerry" />']);
    const entityRefTokens = results[0].tokens.filter((t) =>
      t.scopes.some((s) => s.includes('constant.character.entity.veml')),
    );
    expect(entityRefTokens.length).toBeGreaterThan(0);
  });

  it('highlights tags correctly after a malformed section', () => {
    const results = tokenizeLines([
      '<mesh id="bad">',
      '</meh>',
      '<mesh id="good">',
    ]);
    // The third line should still get proper entity scope
    const goodTokens = results[2].tokens.filter((t) =>
      t.scopes.some((s) => s.includes('entity.name.tag.structure.entity.veml')),
    );
    expect(goodTokens.length).toBeGreaterThan(0);
  });

  it('handles deeply nested VEML correctly', () => {
    const results = tokenizeLines([
      '<veml>',
      '  <environment>',
      '    <container id="parent">',
      '      <mesh id="child">',
      '        <scaletransform>',
      '          <position x="0" y="0" z="0" />',
      '        </scaletransform>',
      '      </mesh>',
      '    </container>',
      '  </environment>',
      '</veml>',
    ]);
    // Check position on line 6 (index 5)
    const posTokens = results[5].tokens.filter((t) =>
      t.scopes.some((s) => s.includes('entity.name.tag.component.veml')),
    );
    expect(posTokens.length).toBeGreaterThan(0);
    expect(posTokens[0].text).toBe('position');
  });

  it('handles CDATA sections without tokenizing inner XML-like content', () => {
    const results = tokenizeLines([
      '<![CDATA[<mesh> not a tag </mesh>]]>',
    ]);
    // Nothing inside CDATA should get entity.name.tag scopes
    const entityTokens = results[0].tokens.filter((t) =>
      t.scopes.some((s) => s.includes('entity.name.tag')),
    );
    expect(entityTokens.length).toBe(0);
  });
});

describe('TextMate Grammar: Complete VEML Document', () => {
  it('tokenizes a full valid VEML document without errors', () => {
    const content = fs.readFileSync(
      path.join(projectRoot, 'syntaxes/__fixtures__/valid-world.veml'),
      'utf8',
    );
    const lines = content.split(/\r?\n/);
    const results = tokenizeLines(lines);

    // Every line should produce at least one token (even whitespace-only)
    for (const result of results) {
      if (result.line.trim().length > 0) {
        expect(result.tokens.length).toBeGreaterThan(0);
      }
    }
  });

  it('tokenizes the complex nesting fixture without issues', () => {
    const content = fs.readFileSync(
      path.join(projectRoot, 'syntaxes/__fixtures__/complex-nesting.veml'),
      'utf8',
    );
    const lines = content.split(/\r?\n/);
    const results = tokenizeLines(lines);

    // All non-empty lines should have tokens
    for (const result of results) {
      if (result.line.trim().length > 0) {
        expect(result.tokens.length).toBeGreaterThan(0);
      }
    }
  });
});
