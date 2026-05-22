/**
 * Script reference index for cross-file navigation between VEML and JS files.
 * Tracks <script>path.js</script> references in VEML documents,
 * enabling go-to-definition and reverse lookups.
 */

import * as path from 'node:path';
import * as acorn from 'acorn';
import type { VemlDocument, SourceRange } from '../../shared/src/index.js';
import { visitNode, NodeKind } from '../../shared/src/index.js';
import { getTextContent, isFilePath } from './textContentUtils.js';
import { URI } from 'vscode-uri';

export interface ScriptReference {
  /** URI of the VEML document containing the <script> element. */
  readonly vemlUri: string;
  /** Raw text content from the <script> element (e.g., "Scripts/index.js"). */
  readonly scriptPath: string;
  /** Resolved file URI of the referenced script. */
  readonly resolvedUri: string;
  /** Source range of the text content within the VEML document. */
  readonly range: SourceRange;
}

export interface JsFunctionDeclaration {
  /** Function name. */
  readonly name: string;
  /** URI of the JS file containing the declaration. */
  readonly uri: string;
  /** Source range of the function declaration. */
  readonly range: SourceRange;
  /** Number of parameters. */
  readonly paramCount: number;
}

/** Maximum number of `..` path traversal levels allowed. */
const MAX_PARENT_TRAVERSAL = 10;

/**
 * Cross-file script reference index.
 * Tracks script paths in VEML <script> elements for navigation and cross-referencing.
 */
export class ScriptIndex {
  /** vemlUri → list of script references from that document */
  private vemlToScripts = new Map<string, ScriptReference[]>();
  /** resolvedUri (lowercase) → list of VEML references pointing to that script */
  private scriptToVemls = new Map<string, ScriptReference[]>();
  /** scriptUri → list of top-level function declarations */
  private jsFunctions = new Map<string, JsFunctionDeclaration[]>();

  /**
   * Index all <script> file references in a VEML document.
   */
  indexDocument(uri: string, doc: VemlDocument, docText: string): void {
    this.removeDocument(uri);

    if (!doc.root) return;

    const refs: ScriptReference[] = [];
    const vemlDir = path.dirname(URI.parse(uri).fsPath);

    visitNode(doc.root, {
      enter(node) {
        if (node.kind !== NodeKind.Script) return;

        const content = getTextContent(node, docText);
        if (!content) return;
        if (!isFilePath(content.text)) return;

        // Skip external URLs
        if (content.text.startsWith('http://') || content.text.startsWith('https://')) return;

        // Safety: reject excessive parent traversal
        const parentLevels = (content.text.match(/\.\.\//g) || []).length;
        if (parentLevels > MAX_PARENT_TRAVERSAL) return;

        const resolvedPath = path.resolve(vemlDir, content.text);
        const resolvedUri = URI.file(resolvedPath).toString();

        refs.push({
          vemlUri: uri,
          scriptPath: content.text,
          resolvedUri,
          range: content.range,
        });
      },
    });

    this.vemlToScripts.set(uri, refs);

    // Build reverse index
    for (const ref of refs) {
      const key = ref.resolvedUri.toLowerCase();
      const existing = this.scriptToVemls.get(key);
      if (existing) {
        existing.push(ref);
      } else {
        this.scriptToVemls.set(key, [ref]);
      }
    }
  }

  /**
   * Remove all script references from a specific VEML document.
   */
  removeDocument(uri: string): void {
    const refs = this.vemlToScripts.get(uri);
    if (!refs) return;

    for (const ref of refs) {
      const key = ref.resolvedUri.toLowerCase();
      const existing = this.scriptToVemls.get(key);
      if (existing) {
        const filtered = existing.filter((r) => r.vemlUri !== uri);
        if (filtered.length === 0) {
          this.scriptToVemls.delete(key);
        } else {
          this.scriptToVemls.set(key, filtered);
        }
      }
    }

    this.vemlToScripts.delete(uri);
  }

  /**
   * Get all script references from a VEML document.
   */
  getScriptReferences(vemlUri: string): readonly ScriptReference[] {
    return this.vemlToScripts.get(vemlUri) ?? [];
  }

  /**
   * Get all VEML documents that reference a given script file.
   */
  getVemlReferences(scriptUri: string): readonly ScriptReference[] {
    return this.scriptToVemls.get(scriptUri.toLowerCase()) ?? [];
  }

  /**
   * Index top-level function declarations in a JS file using acorn.
   * Silently skips files with syntax errors.
   */
  indexJsFile(uri: string, text: string): void {
    this.jsFunctions.delete(uri);

    let program: acorn.Program;
    try {
      program = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
    } catch {
      // Syntax error — skip indexing
      return;
    }

    const funcs: JsFunctionDeclaration[] = [];

    for (const node of program.body) {
      if (node.type === 'FunctionDeclaration' && node.id) {
        funcs.push({
          name: node.id.name,
          uri,
          range: acornLocToRange(node, text),
          paramCount: node.params.length,
        });
      } else if (node.type === 'VariableDeclaration') {
        for (const declarator of node.declarations) {
          if (
            declarator.id.type === 'Identifier' &&
            declarator.init &&
            (declarator.init.type === 'FunctionExpression' || declarator.init.type === 'ArrowFunctionExpression')
          ) {
            funcs.push({
              name: declarator.id.name,
              uri,
              range: acornLocToRange(node, text),
              paramCount: declarator.init.params.length,
            });
          }
        }
      }
    }

    if (funcs.length > 0) {
      this.jsFunctions.set(uri, funcs);
    }
  }

  /**
   * Remove JS function index data for a script file.
   */
  removeJsFile(uri: string): void {
    this.jsFunctions.delete(uri);
  }

  /**
   * Get all top-level function declarations from a JS file.
   */
  getFunctions(scriptUri: string): readonly JsFunctionDeclaration[] {
    return this.jsFunctions.get(scriptUri) ?? [];
  }

  /**
   * Get all function declarations from all JS files referenced by a VEML document.
   */
  getAllFunctionsForVeml(vemlUri: string): readonly JsFunctionDeclaration[] {
    const refs = this.getScriptReferences(vemlUri);
    const result: JsFunctionDeclaration[] = [];
    for (const ref of refs) {
      const funcs = this.jsFunctions.get(ref.resolvedUri);
      if (funcs) {
        result.push(...funcs);
      }
    }
    return result;
  }

  /**
   * Total number of indexed script references.
   */
  getReferenceCount(): number {
    let count = 0;
    for (const refs of this.vemlToScripts.values()) {
      count += refs.length;
    }
    return count;
  }
}

/** Convert an acorn node's location to a SourceRange. */
function acornLocToRange(node: acorn.Node, text: string): SourceRange {
  const loc = node.loc!;
  return {
    start: { line: loc.start.line, column: loc.start.column, offset: node.start },
    end: { line: loc.end.line, column: loc.end.column, offset: node.end },
  };
}
