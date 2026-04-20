import { NodeKind } from './nodeKind.js';

/**
 * A position in a source document (line is 1-based, column is 0-based, offset is 0-based).
 */
export interface SourcePosition {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

/**
 * A range in a source document defined by start and end positions.
 */
export interface SourceRange {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

/**
 * A VEML attribute with name, value, and source location tracking for both.
 */
export interface VemlAttribute {
  readonly name: string;
  readonly value: string;
  readonly nameRange: SourceRange;
  readonly valueRange: SourceRange;
}

/**
 * Base interface for all VEML AST nodes.
 * All properties are readonly to enforce immutability after construction.
 */
export interface VemlNode {
  readonly kind: NodeKind;
  readonly path: string;
  readonly range: SourceRange;
  readonly attributes: readonly VemlAttribute[];
  readonly children: readonly VemlNode[];
  readonly parent: VemlNode | undefined;
  readonly tagName: string;
}

/**
 * An error node representing malformed VEML content.
 * Preserves raw text and error message while maintaining partial children.
 */
export interface ErrorNode extends VemlNode {
  readonly kind: NodeKind.Error;
  readonly rawText: string;
  readonly errorMessage: string;
}

/**
 * The result of parsing a VEML document.
 */
export interface VemlDocument {
  readonly root: VemlNode | undefined;
  readonly errors: readonly ErrorNode[];
  readonly text: string;
}

/**
 * Mutable node used internally by the AST builder.
 * Frozen into immutable VemlNode after construction.
 */
export interface MutableVemlNode {
  kind: NodeKind;
  path: string;
  range: { start: SourcePosition; end: SourcePosition };
  attributes: VemlAttribute[];
  children: MutableVemlNode[];
  parent: MutableVemlNode | undefined;
  tagName: string;
}

/**
 * Mutable error node used internally by the AST builder.
 */
export interface MutableErrorNode extends MutableVemlNode {
  kind: NodeKind.Error;
  rawText: string;
  errorMessage: string;
}
