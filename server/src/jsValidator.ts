/**
 * JavaScript API validator for WebVerse world scripts.
 * Validates API usage (class/method names, parameter counts) using acorn + jsApiSchema.
 */

import * as acorn from 'acorn';
import { getApiClass, isKnownApiClass } from '../../shared/src/jsApiSchema.js';
import { getDiagnosticCode } from '../../shared/src/diagnosticCodes.js';
import type { SourceRange } from '../../shared/src/index.js';

export interface JsDiagnostic {
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info' | 'hint';
  readonly range: SourceRange;
  readonly message: string;
  readonly source: 'webverse-js' | 'worldkit';
}

/** Maximum call expressions to validate per file (DoS protection). */
const MAX_CALLS = 1000;

/**
 * Validate a JavaScript file against the WebVerse API schema.
 * Returns diagnostics for unknown classes, unknown methods, and wrong parameter counts.
 */
export function validateJsFile(text: string, uri: string): JsDiagnostic[] {
  let program: acorn.Program;
  try {
    program = acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'script', locations: true });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    const filename = uri.split('/').pop() ?? uri;
    return [makeDiag('JS302', zeroRange(), { path: filename, detail }, 'webverse-js')];
  }

  const diagnostics: JsDiagnostic[] = [];
  let callCount = 0;

  walkNode(program, (node: any) => {
    if (callCount >= MAX_CALLS) return;

    if (node.type === 'CallExpression') {
      callCount++;
      validateCallExpression(node, text, diagnostics);
    } else if (node.type === 'NewExpression') {
      callCount++;
      validateNewExpression(node, text, diagnostics);
    }
  });

  return diagnostics;
}

function validateCallExpression(node: any, text: string, diagnostics: JsDiagnostic[]): void {
  const callee = node.callee;

  // Only validate ClassName.methodName() pattern
  if (callee.type !== 'MemberExpression') return;
  if (callee.object.type !== 'Identifier') return; // skip chained calls
  if (callee.property.type !== 'Identifier') return; // skip computed access

  const className = callee.object.name;
  const methodName = callee.property.name;

  // Skip if not a known API class name
  if (!isKnownApiClass(className)) return;

  const classSchema = getApiClass(className)!;

  // Conditional API warning
  if (classSchema.conditional) {
    diagnostics.push(makeDiag('JS202', nodeRange(callee.object, text), {
      class: className,
      capability: className,
    }, 'webverse-js'));
  }

  // Look up method
  const method = classSchema.methods.find((m) => m.name === methodName);
  if (!method) {
    diagnostics.push(makeDiag('JS201', nodeRange(callee.property, text), {
      class: className,
      method: methodName,
    }, 'webverse-js'));
    return;
  }

  // Check parameter count against all overloads
  const argCount = node.arguments.length;
  const validCounts = method.overloads.map((o) => o.params.length);
  if (!validCounts.includes(argCount)) {
    const expected = validCounts.join(' or ');
    diagnostics.push(makeDiag('JS300', nodeRange(callee, text), {
      class: className,
      method: methodName,
      expected,
      actual: String(argCount),
    }, 'webverse-js'));
  }
}

function validateNewExpression(node: any, text: string, diagnostics: JsDiagnostic[]): void {
  if (node.callee.type !== 'Identifier') return;

  const className = node.callee.name;

  if (!isKnownApiClass(className)) return;

  const classSchema = getApiClass(className)!;

  if (classSchema.conditional) {
    diagnostics.push(makeDiag('JS202', nodeRange(node.callee, text), {
      class: className,
      capability: className,
    }, 'webverse-js'));
  }

  if (!classSchema.isConstructable) {
    diagnostics.push(makeDiag('JS201', nodeRange(node.callee, text), {
      class: className,
      method: 'constructor',
    }, 'webverse-js'));
    return;
  }

  // Check constructor parameter count
  const argCount = node.arguments.length;
  const validCounts = classSchema.constructorOverloads.map((o) => o.params.length);
  if (validCounts.length > 0 && !validCounts.includes(argCount)) {
    const expected = validCounts.join(' or ');
    diagnostics.push(makeDiag('JS300', nodeRange(node.callee, text), {
      class: className,
      method: 'constructor',
      expected,
      actual: String(argCount),
    }, 'webverse-js'));
  }
}

/** Walk all nodes in an acorn AST, calling visitor for each. */
function walkNode(node: any, visitor: (node: any) => void): void {
  if (!node || typeof node !== 'object') return;
  if (node.type) visitor(node);

  for (const key of Object.keys(node)) {
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && item.type) {
          walkNode(item, visitor);
        }
      }
    } else if (child && typeof child === 'object' && child.type) {
      walkNode(child, visitor);
    }
  }
}

function nodeRange(node: any, text: string): SourceRange {
  const loc = node.loc;
  if (!loc) return zeroRange();
  return {
    start: { line: loc.start.line, column: loc.start.column, offset: node.start },
    end: { line: loc.end.line, column: loc.end.column, offset: node.end },
  };
}

function zeroRange(): SourceRange {
  return {
    start: { line: 1, column: 0, offset: 0 },
    end: { line: 1, column: 0, offset: 0 },
  };
}

function makeDiag(
  codeId: string,
  range: SourceRange,
  args: Record<string, string>,
  source: 'webverse-js' | 'worldkit',
): JsDiagnostic {
  const dc = getDiagnosticCode(codeId)!;
  const message = dc.messageTemplate.replace(/\{(\w+)\}/g, (match, key) => args[key] ?? match);
  return { code: codeId, severity: dc.severity, range, message, source };
}
