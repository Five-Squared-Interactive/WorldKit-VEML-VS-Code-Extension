import { describe, it, expect } from 'vitest';
import { handleHover } from './hoverProvider.js';
import { parseVeml } from './vemlParser.js';

function offsetOf(text: string, substr: string): number {
  const idx = text.indexOf(substr);
  if (idx === -1) throw new Error(`Substring "${substr}" not found in text`);
  return idx;
}

describe('handleHover — element tags', () => {
  it('shows schema description for mesh tag', () => {
    const text = '<veml><environment><mesh id="a"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'mesh id') + 2; // on "mesh" tag name
    const result = handleHover(doc, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain('mesh');
    expect(result!.contents).toContain('3D mesh');
  });

  it('shows optional attributes for mesh tag', () => {
    const text = '<veml><environment><mesh id="a"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'mesh id') + 2;
    const result = handleHover(doc, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain('id');
    expect(result!.contents).toContain('src');
    expect(result!.contents).toContain('visible');
  });

  it('shows allowed children for mesh tag', () => {
    const text = '<veml><environment><mesh id="a"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'mesh id') + 2;
    const result = handleHover(doc, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain('scaletransform');
  });

  it('shows schema for veml root tag', () => {
    const text = '<veml><environment><mesh id="a"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'veml') + 2;
    const result = handleHover(doc, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain('Root element');
  });

  it('returns null for unknown element', () => {
    const text = '<veml><foobar/></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'foobar') + 2;
    const result = handleHover(doc, offset);
    expect(result).toBeNull();
  });

  it('returns null when cursor is outside tag name (in text content)', () => {
    const text = '<veml><environment><mesh id="a"/></environment></veml>';
    const doc = parseVeml(text);
    // Cursor on ">" between tags
    const offset = offsetOf(text, '><environment') + 0;
    const result = handleHover(doc, offset);
    expect(result).toBeNull();
  });

  it('returns null for empty document', () => {
    const doc = parseVeml('');
    const result = handleHover(doc, 0);
    expect(result).toBeNull();
  });

  it('shows hover for environment container element', () => {
    const text = '<veml><environment><mesh id="a"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'environment>') + 2; // on "environment" tag name
    const result = handleHover(doc, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain('environment');
    expect(result!.contents).toContain('mesh');
    // Container usage example includes closing tag
    expect(result!.contents).toContain('</environment>');
  });

  it('includes a usage example', () => {
    const text = '<veml><environment><mesh id="a"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'mesh id') + 2;
    const result = handleHover(doc, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain('<mesh');
  });
});

describe('handleHover — attribute names', () => {
  it('shows description for type attribute on light', () => {
    const text = '<veml><environment><light id="a" type="directional"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'type=') + 1; // on "type" attribute name
    const result = handleHover(doc, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain('type');
    expect(result!.contents).toContain('Light type');
  });

  it('shows enum values for type attribute on light', () => {
    const text = '<veml><environment><light id="a" type="directional"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'type=') + 1;
    const result = handleHover(doc, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain('directional');
    expect(result!.contents).toContain('point');
    expect(result!.contents).toContain('spot');
  });

  it('shows description for id attribute on mesh', () => {
    const text = '<veml><environment><mesh id="hero"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'id=') + 1; // on "id" attribute name
    const result = handleHover(doc, offset);
    expect(result).not.toBeNull();
    expect(result!.contents).toContain('id');
    expect(result!.contents).toContain('identifier');
  });

  it('returns null for unknown attribute name', () => {
    const text = '<veml><environment><mesh id="a" zzzunknown="x"/></environment></veml>';
    const doc = parseVeml(text);
    const offset = offsetOf(text, 'zzzunknown=') + 2;
    const result = handleHover(doc, offset);
    expect(result).toBeNull();
  });
});
