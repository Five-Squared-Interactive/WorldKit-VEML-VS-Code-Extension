/**
 * Go-to-definition provider for VEML entity references and script paths.
 * Resolves entity `ref="..."` values to their `id="..."` definitions,
 * and `<script>path.js</script>` text content to JS file locations.
 */

import * as path from 'node:path';
import type { VemlDocument, VemlNode, VemlAttribute, SourceRange } from '../../shared/src/index.js';
import { visitNode, NodeKind } from '../../shared/src/index.js';
import type { EntityIndex } from './entityIndex.js';
import { getTextContent, isFilePath } from './textContentUtils.js';
import { URI } from 'vscode-uri';

export interface DefinitionLocation {
  uri: string;
  range: SourceRange;
}

/** Maximum number of `..` path traversal levels allowed. */
const MAX_PARENT_TRAVERSAL = 10;

/**
 * Find the definition for the entity reference at the given offset.
 * Returns the definition location, or null if the cursor isn't on a resolvable reference.
 */
export function handleDefinition(
  doc: VemlDocument,
  offset: number,
  entityIndex: EntityIndex,
  docUri?: string,
): DefinitionLocation | null {
  if (!doc.root) return null;

  // Check if cursor is on a <script> text content first
  if (docUri) {
    const scriptDef = findScriptDefinition(doc, offset, docUri);
    if (scriptDef) return scriptDef;
  }

  const hit = findAttributeValueAtOffset(doc.root, offset);
  if (!hit) return null;

  const { attribute } = hit;

  // Cursor is on a ref="..." value — resolve to the id definition
  if (attribute.name === 'ref') {
    const def = entityIndex.getDefinition(attribute.value);
    if (!def) return null;
    return { uri: def.uri, range: def.range };
  }

  // Cursor is on an id="..." value — resolve to self (identity navigation)
  if (attribute.name === 'id') {
    const def = entityIndex.getDefinition(attribute.value);
    if (!def) return null;
    return { uri: def.uri, range: def.range };
  }

  return null;
}

/**
 * Check if cursor is inside a <script> element's text content and resolve to file.
 */
function findScriptDefinition(
  doc: VemlDocument,
  offset: number,
  docUri: string,
): DefinitionLocation | null {
  if (!doc.root) return null;

  let result: DefinitionLocation | null = null;

  visitNode(doc.root, {
    enter(node) {
      if (result) return false;

      // Only interested in <script> nodes
      if (node.kind !== NodeKind.Script) return;

      // Check if offset is within this node's range
      if (offset < node.range.start.offset || offset > node.range.end.offset) return;

      const content = getTextContent(node, doc.text);
      if (!content) return;

      // Check offset is within the text content range
      if (offset < content.range.start.offset || offset > content.range.end.offset) return;

      // Only handle file paths, not inline JS
      if (!isFilePath(content.text)) return;

      // Skip external URLs
      if (content.text.startsWith('http://') || content.text.startsWith('https://')) return;

      // Check for excessive parent traversal
      const parentLevels = (content.text.match(/\.\.\//g) || []).length;
      if (parentLevels > MAX_PARENT_TRAVERSAL) return;

      // Resolve relative to VEML file directory
      const vemlDir = path.dirname(URI.parse(docUri).fsPath);
      const resolvedPath = path.resolve(vemlDir, content.text);
      const targetUri = URI.file(resolvedPath).toString();

      result = {
        uri: targetUri,
        range: {
          start: { line: 1, column: 0, offset: 0 },
          end: { line: 1, column: 0, offset: 0 },
        },
      };
    },
  });

  return result;
}

/**
 * Find the attribute whose valueRange contains the given offset.
 * Walks the AST depth-first and checks each attribute's valueRange.
 */
export function findAttributeValueAtOffset(
  root: VemlNode,
  offset: number,
): { node: VemlNode; attribute: VemlAttribute } | undefined {
  let result: { node: VemlNode; attribute: VemlAttribute } | undefined;
  let found = false;

  visitNode(root, {
    enter(node) {
      // Early termination — skip all remaining nodes after match (Finding 6)
      if (found) return false;

      // Skip nodes whose range doesn't contain the offset
      if (offset < node.range.start.offset || offset > node.range.end.offset) {
        return false; // skip children
      }

      for (const attr of node.attributes) {
        if (offset >= attr.valueRange.start.offset && offset < attr.valueRange.end.offset) {
          result = { node, attribute: attr };
          found = true;
          return false; // found it, stop traversal
        }
      }
    },
  });

  return result;
}
