import { describe, it, expect } from 'vitest';
import {
  API_CLASSES,
  API_CLASS_NAMES,
  getApiClass,
  isKnownApiClass,
} from './jsApiSchema.js';

describe('jsApiSchema', () => {
  describe('getApiClass', () => {
    it('returns schema for known class', () => {
      const schema = getApiClass('Vector3');
      expect(schema).toBeDefined();
      expect(schema!.className).toBe('Vector3');
      expect(schema!.isConstructable).toBe(true);
    });

    it('returns undefined for unknown class', () => {
      expect(getApiClass('NotAClass')).toBeUndefined();
      expect(getApiClass('')).toBeUndefined();
    });

    it('is case-sensitive', () => {
      expect(getApiClass('vector3')).toBeUndefined();
      expect(getApiClass('VECTOR3')).toBeUndefined();
    });
  });

  describe('isKnownApiClass', () => {
    it('returns true for known classes', () => {
      expect(isKnownApiClass('Vector3')).toBe(true);
      expect(isKnownApiClass('Entity')).toBe(true);
      expect(isKnownApiClass('Camera')).toBe(true);
      expect(isKnownApiClass('Logging')).toBe(true);
    });

    it('returns false for unknown classes', () => {
      expect(isKnownApiClass('UnknownClass')).toBe(false);
      expect(isKnownApiClass('')).toBe(false);
    });
  });

  describe('Vector3 schema', () => {
    it('has 0-arg and 3-arg constructor overloads', () => {
      const schema = getApiClass('Vector3')!;
      expect(schema.constructorOverloads).toHaveLength(2);
      expect(schema.constructorOverloads[0].params).toHaveLength(0);
      expect(schema.constructorOverloads[1].params).toHaveLength(3);
    });

    it('has static methods', () => {
      const schema = getApiClass('Vector3')!;
      const staticMethods = schema.methods.filter((m) => m.isStatic);
      const names = staticMethods.map((m) => m.name);
      expect(names).toContain('Distance');
      expect(names).toContain('Cross');
      expect(names).toContain('Lerp');
    });

    it('has instance methods', () => {
      const schema = getApiClass('Vector3')!;
      const instanceMethods = schema.methods.filter((m) => !m.isStatic);
      const names = instanceMethods.map((m) => m.name);
      expect(names).toContain('Normalize');
      expect(names).toContain('Set');
    });

    it('has properties', () => {
      const schema = getApiClass('Vector3')!;
      const propNames = schema.properties.map((p) => p.name);
      expect(propNames).toContain('x');
      expect(propNames).toContain('y');
      expect(propNames).toContain('z');
      expect(propNames).toContain('magnitude');
    });

    it('is not conditional', () => {
      expect(getApiClass('Vector3')!.conditional).toBe(false);
    });
  });

  describe('Color schema', () => {
    it('has 3-arg and 4-arg constructor overloads', () => {
      const schema = getApiClass('Color')!;
      expect(schema.constructorOverloads).toHaveLength(2);
      expect(schema.constructorOverloads[0].params).toHaveLength(3);
      expect(schema.constructorOverloads[1].params).toHaveLength(4);
    });
  });

  describe('Quaternion schema', () => {
    it('has 0-arg and 4-arg constructor overloads', () => {
      const schema = getApiClass('Quaternion')!;
      expect(schema.constructorOverloads).toHaveLength(2);
      expect(schema.constructorOverloads[0].params).toHaveLength(0);
      expect(schema.constructorOverloads[1].params).toHaveLength(4);
    });

    it('has LookRotation with 1-arg and 2-arg overloads', () => {
      const schema = getApiClass('Quaternion')!;
      const lookRotation = schema.methods.find((m) => m.name === 'LookRotation');
      expect(lookRotation).toBeDefined();
      expect(lookRotation!.overloads).toHaveLength(2);
      expect(lookRotation!.overloads[0].params).toHaveLength(1);
      expect(lookRotation!.overloads[1].params).toHaveLength(2);
    });
  });

  describe('Entity schema', () => {
    it('is not constructable', () => {
      expect(getApiClass('Entity')!.isConstructable).toBe(false);
    });

    it('has Get static method', () => {
      const schema = getApiClass('Entity')!;
      const get = schema.methods.find((m) => m.name === 'Get');
      expect(get).toBeDefined();
      expect(get!.isStatic).toBe(true);
      expect(get!.overloads[0].params).toHaveLength(1);
    });

    it('has create with multiple overloads', () => {
      const schema = getApiClass('Entity')!;
      const create = schema.methods.find((m) => m.name === 'create');
      expect(create).toBeDefined();
      expect(create!.overloads.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Entity subtypes', () => {
    const subtypes = [
      'MeshEntity', 'LightEntity', 'TextEntity', 'ButtonEntity',
      'ContainerEntity', 'CanvasEntity', 'CharacterEntity',
    ];

    for (const name of subtypes) {
      it(`${name} exists and has create method`, () => {
        const schema = getApiClass(name);
        expect(schema).toBeDefined();
        expect(schema!.isConstructable).toBe(false);
        const create = schema!.methods.find((m) => m.name === 'create');
        expect(create).toBeDefined();
        expect(create!.isStatic).toBe(true);
      });
    }

    it('MeshEntity has LoadMesh method', () => {
      const schema = getApiClass('MeshEntity')!;
      const loadMesh = schema.methods.find((m) => m.name === 'LoadMesh');
      expect(loadMesh).toBeDefined();
      expect(loadMesh!.isStatic).toBe(true);
    });
  });

  describe('Static-only APIs', () => {
    const staticApis = ['Camera', 'Input', 'World', 'Environment', 'HTTPNetworking',
      'Time', 'Logging', 'LocalStorage', 'AsyncJSON', 'Context', 'Scripting'];

    for (const name of staticApis) {
      it(`${name} is not constructable`, () => {
        const schema = getApiClass(name);
        expect(schema).toBeDefined();
        expect(schema!.isConstructable).toBe(false);
        expect(schema!.constructorOverloads).toHaveLength(0);
      });
    }
  });

  describe('Conditional APIs', () => {
    it('WorldSync is conditional', () => {
      const schema = getApiClass('WorldSync');
      expect(schema).toBeDefined();
      expect(schema!.conditional).toBe(true);
    });

    it('VOSSynchronization is conditional', () => {
      expect(getApiClass('VOSSynchronization')!.conditional).toBe(true);
    });

    it('MQTTClient is conditional', () => {
      expect(getApiClass('MQTTClient')!.conditional).toBe(true);
    });

    it('WebSocket is conditional', () => {
      expect(getApiClass('WebSocket')!.conditional).toBe(true);
    });

    it('Voice is conditional', () => {
      expect(getApiClass('Voice')!.conditional).toBe(true);
    });

    it('non-conditional APIs have conditional=false', () => {
      expect(getApiClass('Vector3')!.conditional).toBe(false);
      expect(getApiClass('Entity')!.conditional).toBe(false);
      expect(getApiClass('Camera')!.conditional).toBe(false);
    });
  });

  describe('API_CLASSES', () => {
    it('contains all registered classes', () => {
      expect(API_CLASSES.length).toBeGreaterThan(30);
    });

    it('every class has a unique name', () => {
      const names = API_CLASSES.map((c) => c.className);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('API_CLASS_NAMES', () => {
    it('includes all class names', () => {
      expect(API_CLASS_NAMES).toContain('Vector3');
      expect(API_CLASS_NAMES).toContain('Entity');
      expect(API_CLASS_NAMES).toContain('Camera');
      expect(API_CLASS_NAMES).toContain('WorldSync');
    });

    it('matches API_CLASSES length', () => {
      expect(API_CLASS_NAMES.length).toBe(API_CLASSES.length);
    });
  });

  describe('Scripting has overloaded RunScript', () => {
    it('has 3 overloads', () => {
      const schema = getApiClass('Scripting')!;
      const runScript = schema.methods.find((m) => m.name === 'RunScript');
      expect(runScript).toBeDefined();
      expect(runScript!.overloads).toHaveLength(3);
      expect(runScript!.overloads[0].params).toHaveLength(1);
      expect(runScript!.overloads[1].params).toHaveLength(2);
      expect(runScript!.overloads[2].params).toHaveLength(3);
    });
  });
});
