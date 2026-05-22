/**
 * Virtual document service for inline <script> blocks in VEML files.
 * Extracts inline JS content and provides VEML ↔ JS offset mapping.
 */

import type { VemlDocument } from '../../shared/src/index.js';
import { visitNode, NodeKind } from '../../shared/src/index.js';
import { getTextContent, isFilePath } from './textContentUtils.js';

export interface InlineScript {
  /** The extracted JS text content. */
  readonly text: string;
  /** Offset of the first character of JS content within the VEML document. */
  readonly vemlOffset: number;
  /** Length of the JS content. */
  readonly length: number;
}

/**
 * Extracts and tracks inline <script> blocks from VEML documents.
 */
export class VirtualDocService {
  /** vemlUri → list of inline script blocks */
  private scripts = new Map<string, InlineScript[]>();

  /**
   * Extract inline script blocks from a VEML document.
   * Only extracts blocks where the content is NOT a file path.
   */
  indexDocument(uri: string, doc: VemlDocument, docText: string): void {
    this.scripts.delete(uri);

    if (!doc.root) return;

    const blocks: InlineScript[] = [];

    visitNode(doc.root, {
      enter(node) {
        if (node.kind !== NodeKind.Script) return;

        const content = getTextContent(node, docText);
        if (!content) return;

        // Skip file references — only extract inline JS
        if (isFilePath(content.text)) return;

        blocks.push({
          text: docText.substring(content.range.start.offset, content.range.end.offset),
          vemlOffset: content.range.start.offset,
          length: content.range.end.offset - content.range.start.offset,
        });
      },
    });

    if (blocks.length > 0) {
      this.scripts.set(uri, blocks);
    }
  }

  /**
   * Remove all inline script data for a VEML document.
   */
  removeDocument(uri: string): void {
    this.scripts.delete(uri);
  }

  /**
   * Get all inline script blocks for a VEML document.
   */
  getInlineScripts(vemlUri: string): readonly InlineScript[] {
    return this.scripts.get(vemlUri) ?? [];
  }

  /**
   * Map a VEML offset to a JS offset within an inline script block.
   * Returns undefined if the offset is not inside any inline script.
   */
  vemlOffsetToJsOffset(vemlUri: string, vemlOffset: number): { scriptIndex: number; jsOffset: number } | undefined {
    const blocks = this.scripts.get(vemlUri);
    if (!blocks) return undefined;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (vemlOffset >= block.vemlOffset && vemlOffset < block.vemlOffset + block.length) {
        return { scriptIndex: i, jsOffset: vemlOffset - block.vemlOffset };
      }
    }

    return undefined;
  }

  /**
   * Map a JS offset back to a VEML offset.
   */
  jsOffsetToVemlOffset(vemlUri: string, scriptIndex: number, jsOffset: number): number {
    const blocks = this.scripts.get(vemlUri);
    if (!blocks || scriptIndex >= blocks.length) return 0;
    return blocks[scriptIndex].vemlOffset + jsOffset;
  }
}
