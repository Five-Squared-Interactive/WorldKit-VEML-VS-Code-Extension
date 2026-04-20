/**
 * Test AST node builders for creating test fixtures.
 */
import { NodeKind } from '../../shared/src/nodeKind.js';
import type { VemlNode, ErrorNode, SourcePosition, SourceRange } from '../../shared/src/ast.types.js';

const ZERO_POS: SourcePosition = { line: 1, column: 0, offset: 0 };
const ZERO_RANGE: SourceRange = { start: ZERO_POS, end: ZERO_POS };

export function createTestNode(
  kind: NodeKind,
  tagName: string,
  overrides: Partial<VemlNode> = {},
): VemlNode {
  return {
    kind,
    path: `/${tagName}`,
    range: ZERO_RANGE,
    attributes: [],
    children: [],
    parent: undefined,
    tagName,
    ...overrides,
  };
}

export function createTestVemlNode(overrides: Partial<VemlNode> = {}): VemlNode {
  return createTestNode(NodeKind.Veml, 'veml', { path: '/veml', ...overrides });
}

export function createTestEntityNode(
  id: string,
  tagName = 'mesh',
  overrides: Partial<VemlNode> = {},
): VemlNode {
  return createTestNode(NodeKind.Mesh, tagName, {
    path: `/veml/environment/${tagName}`,
    attributes: [{
      name: 'id',
      value: id,
      nameRange: ZERO_RANGE,
      valueRange: ZERO_RANGE,
    }],
    ...overrides,
  });
}

export function createTestErrorNode(
  errorMessage: string,
  overrides: Partial<ErrorNode> = {},
): ErrorNode {
  return {
    kind: NodeKind.Error,
    path: '/error',
    range: ZERO_RANGE,
    attributes: [],
    children: [],
    parent: undefined,
    tagName: '',
    rawText: '',
    errorMessage,
    ...overrides,
  };
}
