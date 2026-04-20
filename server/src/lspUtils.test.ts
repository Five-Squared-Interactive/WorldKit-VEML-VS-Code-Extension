import { describe, it, expect } from 'vitest';
import { sourceRangeToLspRange } from './lspUtils.js';

describe('sourceRangeToLspRange', () => {
  it('converts 1-based lines to 0-based', () => {
    const result = sourceRangeToLspRange({
      start: { line: 1, column: 0, offset: 0 },
      end: { line: 1, column: 5, offset: 5 },
    });
    expect(result.start.line).toBe(0);
    expect(result.start.character).toBe(0);
    expect(result.end.line).toBe(0);
    expect(result.end.character).toBe(5);
  });

  it('preserves 0-based columns as characters', () => {
    const result = sourceRangeToLspRange({
      start: { line: 3, column: 10, offset: 50 },
      end: { line: 3, column: 20, offset: 60 },
    });
    expect(result.start.line).toBe(2);
    expect(result.start.character).toBe(10);
    expect(result.end.line).toBe(2);
    expect(result.end.character).toBe(20);
  });
});
