import { describe, it, expect } from 'vitest';
import { getElementSchema, VALID_ELEMENT_NAMES, ELEMENT_SCHEMAS } from './vemlSchema.js';
import { NodeKind, tagNameToKind } from './nodeKind.js';

describe('VEML Schema', () => {
  it('exports a non-empty list of valid element names', () => {
    expect(VALID_ELEMENT_NAMES.length).toBeGreaterThan(0);
  });

  it('has a schema entry for every VALID_ELEMENT_NAMES entry', () => {
    for (const name of VALID_ELEMENT_NAMES) {
      const schema = getElementSchema(name);
      expect(schema, `Missing schema for ${name}`).toBeDefined();
    }
  });

  it('returns undefined for unknown element names', () => {
    expect(getElementSchema('foobar')).toBeUndefined();
  });

  it('veml element is the root with no required attributes', () => {
    const schema = getElementSchema('veml');
    expect(schema).toBeDefined();
    expect(schema!.allowedParents).toHaveLength(0);
  });

  it('mesh entity has id as optional attribute', () => {
    const schema = getElementSchema('mesh');
    expect(schema).toBeDefined();
    const idAttr = schema!.optionalAttributes.find((a) => a.name === 'id');
    expect(idAttr).toBeDefined();
  });

  it('veml allows metadata and environment as children', () => {
    const schema = getElementSchema('veml');
    expect(schema!.allowedChildren).toContain('metadata');
    expect(schema!.allowedChildren).toContain('environment');
  });

  it('environment allows background, effects, and entity types as children', () => {
    const schema = getElementSchema('environment');
    expect(schema!.allowedChildren).toContain('background');
    expect(schema!.allowedChildren).toContain('effects');
    expect(schema!.allowedChildren).toContain('mesh');
    expect(schema!.allowedChildren).toContain('light');
    expect(schema!.allowedChildren).toContain('character');
  });

  it('mesh allows transforms and nested entity children', () => {
    const schema = getElementSchema('mesh');
    expect(schema!.allowedChildren).toContain('scaletransform');
    expect(schema!.allowedChildren).toContain('sizetransform');
    expect(schema!.allowedChildren).toContain('mesh');
    expect(schema!.allowedChildren).toContain('container');
  });

  it('position is a leaf element with no children', () => {
    const schema = getElementSchema('position');
    expect(schema!.allowedChildren).toHaveLength(0);
  });

  it('background contains panorama, color, lite-procedural-sky', () => {
    const schema = getElementSchema('background');
    expect(schema!.allowedChildren).toContain('panorama');
    expect(schema!.allowedChildren).toContain('color');
    expect(schema!.allowedChildren).toContain('lite-procedural-sky');
    expect(schema!.allowedParents).toContain('environment');
  });

  it('entity types can be children of environment and other entity types', () => {
    const schema = getElementSchema('mesh');
    expect(schema!.allowedParents).toContain('environment');
    expect(schema!.allowedParents).toContain('container');
    expect(schema!.allowedParents).toContain('mesh');
  });

  it('VALID_ELEMENT_NAMES matches schema lookup', () => {
    for (const name of VALID_ELEMENT_NAMES) {
      expect(getElementSchema(name), `${name} in VALID_ELEMENT_NAMES but no schema`).toBeDefined();
    }
  });

  it('all valid element names resolve to a known NodeKind', () => {
    for (const name of VALID_ELEMENT_NAMES) {
      const kind = tagNameToKind(name);
      expect(kind, `${name} should resolve to a NodeKind`).not.toBe(NodeKind.Unknown);
    }
  });

  // ── Story 2.1: Schema extensions for autocomplete ─────────────

  describe('element descriptions', () => {
    it('every element schema has a non-empty description', () => {
      for (const schema of ELEMENT_SCHEMAS) {
        expect(schema.description, `${schema.tagName} missing description`).toBeTruthy();
        expect(typeof schema.description).toBe('string');
        expect(schema.description.length).toBeGreaterThan(0);
      }
    });

    it('veml element has a meaningful description', () => {
      const schema = getElementSchema('veml');
      expect(schema!.description.toLowerCase()).toContain('root');
    });

    it('mesh element has a meaningful description', () => {
      const schema = getElementSchema('mesh');
      expect(schema!.description.toLowerCase()).toContain('mesh');
    });
  });

  describe('enum values for autocomplete', () => {
    it('light.type has enum values including directional, point, spot', () => {
      const schema = getElementSchema('light');
      const typeAttr = schema!.optionalAttributes.find((a) => a.name === 'type');
      expect(typeAttr).toBeDefined();
      expect(typeAttr!.enumValues).toBeDefined();
      expect(typeAttr!.enumValues).toContain('directional');
      expect(typeAttr!.enumValues).toContain('point');
      expect(typeAttr!.enumValues).toContain('spot');
    });

    it('enum values are arrays of strings when present', () => {
      for (const schema of ELEMENT_SCHEMAS) {
        for (const attr of schema.optionalAttributes) {
          if (attr.enumValues !== undefined) {
            expect(Array.isArray(attr.enumValues), `${schema.tagName}.${attr.name} enumValues should be array`).toBe(true);
            for (const val of attr.enumValues) {
              expect(typeof val).toBe('string');
            }
          }
        }
      }
    });

    it('boolean-typed attributes do not have enumValues (handled by provider)', () => {
      for (const schema of ELEMENT_SCHEMAS) {
        for (const attr of schema.optionalAttributes) {
          if (attr.type === 'boolean') {
            expect(attr.enumValues, `${schema.tagName}.${attr.name} boolean should not have enumValues`).toBeUndefined();
          }
        }
      }
    });
  });
});
