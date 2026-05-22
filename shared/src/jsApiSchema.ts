/**
 * WebVerse JavaScript API schema definitions for server-side validation.
 * Static data structure describing API classes, methods, and their signatures.
 * Source of truth: JavascriptHandler.cs registration list + javascript-api.md docs.
 *
 * Follows the same pattern as vemlSchema.ts: static array + Map + lookup function.
 */

// ── Interfaces ────────────────────────────────────────────────────────

export interface MethodSignature {
  readonly params: readonly { readonly name: string; readonly type: string }[];
  readonly returnType: string;
}

export interface JsApiMethodSchema {
  readonly name: string;
  readonly isStatic: boolean;
  readonly overloads: readonly MethodSignature[];
}

export interface JsApiPropertySchema {
  readonly name: string;
  readonly type: string;
  readonly readonly: boolean;
}

export interface JsApiClassSchema {
  readonly className: string;
  readonly description: string;
  readonly isConstructable: boolean;
  readonly constructorOverloads: readonly MethodSignature[];
  readonly methods: readonly JsApiMethodSchema[];
  readonly properties: readonly JsApiPropertySchema[];
  readonly conditional: boolean;
}

// ── Helper for concise schema definitions ─────────────────────────────

function m(
  name: string,
  isStatic: boolean,
  overloads: MethodSignature[],
): JsApiMethodSchema {
  return { name, isStatic, overloads };
}

function sig(params: { name: string; type: string }[], returnType: string): MethodSignature {
  return { params, returnType };
}

function p(name: string, type: string, readonly = false): JsApiPropertySchema {
  return { name, type, readonly };
}

// ── Common parameter shapes ──────────────────────────────────────────

const VECTOR2_PARAMS = [{ name: 'x', type: 'number' }, { name: 'y', type: 'number' }];
const VECTOR3_PARAMS = [{ name: 'x', type: 'number' }, { name: 'y', type: 'number' }, { name: 'z', type: 'number' }];
const VECTOR4_PARAMS = [{ name: 'x', type: 'number' }, { name: 'y', type: 'number' }, { name: 'z', type: 'number' }, { name: 'w', type: 'number' }];

// ── Vector2 family ────────────────────────────────────────────────────

function vector2Schema(className: string, compType: string): JsApiClassSchema {
  return {
    className,
    description: `2D ${compType} vector`,
    isConstructable: true,
    constructorOverloads: [sig(VECTOR2_PARAMS, className)],
    methods: [
      m('Normalize', false, [sig([], 'void')]),
      m('Set', false, [sig(VECTOR2_PARAMS, 'void')]),
      m('ToString', false, [sig([], 'string')]),
      m('Distance', true, [sig([{ name: 'a', type: className }, { name: 'b', type: className }], 'number')]),
      m('Dot', true, [sig([{ name: 'a', type: className }, { name: 'b', type: className }], 'number')]),
      m('Angle', true, [sig([{ name: 'from', type: className }, { name: 'to', type: className }], 'number')]),
      m('Lerp', true, [sig([{ name: 'a', type: className }, { name: 'b', type: className }, { name: 't', type: 'number' }], className)]),
    ],
    properties: [
      p('x', compType), p('y', compType),
      p('magnitude', 'number', true), p('sqrMagnitude', 'number', true),
      p('normalized', className, true),
    ],
    conditional: false,
  };
}

// ── Vector3 family ────────────────────────────────────────────────────

function vector3Schema(className: string, compType: string): JsApiClassSchema {
  return {
    className,
    description: `3D ${compType} vector`,
    isConstructable: true,
    constructorOverloads: [sig([], className), sig(VECTOR3_PARAMS, className)],
    methods: [
      m('Normalize', false, [sig([], 'void')]),
      m('Set', false, [sig(VECTOR3_PARAMS, 'void')]),
      m('ToString', false, [sig([], 'string')]),
      m('Cross', true, [sig([{ name: 'a', type: className }, { name: 'b', type: className }], className)]),
      m('Distance', true, [sig([{ name: 'a', type: className }, { name: 'b', type: className }], 'number')]),
      m('Dot', true, [sig([{ name: 'a', type: className }, { name: 'b', type: className }], 'number')]),
      m('Lerp', true, [sig([{ name: 'a', type: className }, { name: 'b', type: className }, { name: 't', type: 'number' }], className)]),
      m('Slerp', true, [sig([{ name: 'a', type: className }, { name: 'b', type: className }, { name: 't', type: 'number' }], className)]),
      m('Project', true, [sig([{ name: 'vector', type: className }, { name: 'onNormal', type: className }], className)]),
    ],
    properties: [
      p('x', compType), p('y', compType), p('z', compType),
      p('magnitude', 'number', true), p('sqrMagnitude', 'number', true),
      p('normalized', className, true),
    ],
    conditional: false,
  };
}

// ── Schema Definitions ────────────────────────────────────────────────

const SCHEMAS: JsApiClassSchema[] = [
  // World Types — Vector2 family
  vector2Schema('Vector2', 'number'),
  vector2Schema('Vector2D', 'number'),
  {
    ...vector2Schema('Vector2Int', 'number'),
    description: '2D integer vector',
    methods: [
      m('Set', false, [sig(VECTOR2_PARAMS, 'void')]),
      m('ToString', false, [sig([], 'string')]),
      m('Distance', true, [sig([{ name: 'a', type: 'Vector2Int' }, { name: 'b', type: 'Vector2Int' }], 'number')]),
    ],
  },

  // World Types — Vector3 family
  vector3Schema('Vector3', 'number'),
  vector3Schema('Vector3D', 'number'),
  {
    ...vector3Schema('Vector3Int', 'number'),
    description: '3D integer vector',
    methods: [
      m('Set', false, [sig(VECTOR3_PARAMS, 'void')]),
      m('ToString', false, [sig([], 'string')]),
      m('Distance', true, [sig([{ name: 'a', type: 'Vector3Int' }, { name: 'b', type: 'Vector3Int' }], 'number')]),
    ],
  },

  // World Types — Vector4 family
  {
    className: 'Vector4',
    description: '4D vector',
    isConstructable: true,
    constructorOverloads: [sig(VECTOR4_PARAMS, 'Vector4')],
    methods: [
      m('Set', false, [sig(VECTOR4_PARAMS, 'void')]),
      m('ToString', false, [sig([], 'string')]),
    ],
    properties: [
      p('x', 'number'), p('y', 'number'), p('z', 'number'), p('w', 'number'),
    ],
    conditional: false,
  },
  {
    className: 'Vector4D',
    description: '4D double-precision vector',
    isConstructable: true,
    constructorOverloads: [sig(VECTOR4_PARAMS, 'Vector4D')],
    methods: [
      m('Set', false, [sig(VECTOR4_PARAMS, 'void')]),
      m('ToString', false, [sig([], 'string')]),
    ],
    properties: [
      p('x', 'number'), p('y', 'number'), p('z', 'number'), p('w', 'number'),
    ],
    conditional: false,
  },
  {
    className: 'Vector4Int',
    description: '4D integer vector',
    isConstructable: true,
    constructorOverloads: [sig(VECTOR4_PARAMS, 'Vector4Int')],
    methods: [
      m('Set', false, [sig(VECTOR4_PARAMS, 'void')]),
      m('ToString', false, [sig([], 'string')]),
    ],
    properties: [
      p('x', 'number'), p('y', 'number'), p('z', 'number'), p('w', 'number'),
    ],
    conditional: false,
  },

  // Color
  {
    className: 'Color',
    description: 'RGBA color (components 0-1)',
    isConstructable: true,
    constructorOverloads: [
      sig([{ name: 'r', type: 'number' }, { name: 'g', type: 'number' }, { name: 'b', type: 'number' }], 'Color'),
      sig([{ name: 'r', type: 'number' }, { name: 'g', type: 'number' }, { name: 'b', type: 'number' }, { name: 'a', type: 'number' }], 'Color'),
    ],
    methods: [
      m('ToString', false, [sig([], 'string')]),
      m('Lerp', true, [sig([{ name: 'a', type: 'Color' }, { name: 'b', type: 'Color' }, { name: 't', type: 'number' }], 'Color')]),
      m('HSVToRGB', true, [sig([{ name: 'h', type: 'number' }, { name: 's', type: 'number' }, { name: 'v', type: 'number' }], 'Color')]),
      m('RGBToHSV', true, [sig([{ name: 'color', type: 'Color' }], 'Vector3')]),
    ],
    properties: [
      p('r', 'number'), p('g', 'number'), p('b', 'number'), p('a', 'number'),
    ],
    conditional: false,
  },

  // Quaternion
  {
    className: 'Quaternion',
    description: 'Rotation quaternion',
    isConstructable: true,
    constructorOverloads: [sig([], 'Quaternion'), sig(VECTOR4_PARAMS, 'Quaternion')],
    methods: [
      m('ToString', false, [sig([], 'string')]),
      m('Euler', true, [sig(VECTOR3_PARAMS, 'Quaternion')]),
      m('Angle', true, [sig([{ name: 'a', type: 'Quaternion' }, { name: 'b', type: 'Quaternion' }], 'number')]),
      m('Dot', true, [sig([{ name: 'a', type: 'Quaternion' }, { name: 'b', type: 'Quaternion' }], 'number')]),
      m('Lerp', true, [sig([{ name: 'a', type: 'Quaternion' }, { name: 'b', type: 'Quaternion' }, { name: 't', type: 'number' }], 'Quaternion')]),
      m('Slerp', true, [sig([{ name: 'a', type: 'Quaternion' }, { name: 'b', type: 'Quaternion' }, { name: 't', type: 'number' }], 'Quaternion')]),
      m('LookRotation', true, [
        sig([{ name: 'forward', type: 'Vector3' }], 'Quaternion'),
        sig([{ name: 'forward', type: 'Vector3' }, { name: 'up', type: 'Vector3' }], 'Quaternion'),
      ]),
      m('Inverse', true, [sig([{ name: 'q', type: 'Quaternion' }], 'Quaternion')]),
      m('FromToRotation', true, [sig([{ name: 'from', type: 'Vector3' }, { name: 'to', type: 'Vector3' }], 'Quaternion')]),
    ],
    properties: [
      p('x', 'number'), p('y', 'number'), p('z', 'number'), p('w', 'number'),
      p('eulerAngles', 'Vector3'),
    ],
    conditional: false,
  },
  {
    className: 'QuaternionD',
    description: 'Double-precision rotation quaternion',
    isConstructable: true,
    constructorOverloads: [sig([], 'QuaternionD'), sig(VECTOR4_PARAMS, 'QuaternionD')],
    methods: [
      m('ToString', false, [sig([], 'string')]),
    ],
    properties: [
      p('x', 'number'), p('y', 'number'), p('z', 'number'), p('w', 'number'),
    ],
    conditional: false,
  },

  // UUID
  {
    className: 'UUID',
    description: 'UUID generator',
    isConstructable: true,
    constructorOverloads: [sig([], 'UUID')],
    methods: [
      m('NewUUID', true, [sig([], 'string')]),
      m('ToString', false, [sig([], 'string')]),
    ],
    properties: [],
    conditional: false,
  },

  // RaycastHitInfo
  {
    className: 'RaycastHitInfo',
    description: 'Raycast hit information',
    isConstructable: false,
    constructorOverloads: [],
    methods: [],
    properties: [
      p('entity', 'Entity', true),
      p('point', 'Vector3', true),
      p('normal', 'Vector3', true),
      p('distance', 'number', true),
    ],
    conditional: false,
  },

  // Entity (base)
  {
    className: 'Entity',
    description: 'Base entity',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('Get', true, [sig([{ name: 'idOrTag', type: 'string' }], 'Entity')]),
      m('create', true, [
        sig([], 'Entity'),
        sig([{ name: 'name', type: 'string' }], 'Entity'),
        sig([{ name: 'name', type: 'string' }, { name: 'parent', type: 'Entity' }], 'Entity'),
      ]),
      m('createWithTransform', true, [sig([{ name: 'name', type: 'string' }, { name: 'transform', type: 'object' }], 'Entity')]),
      m('destroy', false, [sig([], 'void')]),
      m('setActive', false, [sig([{ name: 'active', type: 'boolean' }], 'void')]),
      m('isActive', false, [sig([], 'boolean')]),
      m('setParent', false, [sig([{ name: 'parent', type: 'Entity' }], 'void')]),
      m('addChild', false, [sig([{ name: 'child', type: 'Entity' }], 'void')]),
      m('removeChild', false, [sig([{ name: 'child', type: 'Entity' }], 'void')]),
      m('getChild', false, [sig([{ name: 'index', type: 'number' }], 'Entity')]),
      m('findChild', false, [sig([{ name: 'name', type: 'string' }], 'Entity')]),
      m('addComponent', false, [sig([{ name: 'type', type: 'string' }], 'void')]),
      m('getComponent', false, [sig([{ name: 'type', type: 'string' }], 'object')]),
      m('hasComponent', false, [sig([{ name: 'type', type: 'string' }], 'boolean')]),
      m('removeComponent', false, [sig([{ name: 'type', type: 'string' }], 'void')]),
      m('setProperty', false, [sig([{ name: 'name', type: 'string' }, { name: 'value', type: 'any' }], 'void')]),
      m('getProperty', false, [sig([{ name: 'name', type: 'string' }], 'any')]),
      m('hasProperty', false, [sig([{ name: 'name', type: 'string' }], 'boolean')]),
      m('removeProperty', false, [sig([{ name: 'name', type: 'string' }], 'void')]),
      m('SetVisibility', false, [
        sig([{ name: 'visible', type: 'boolean' }], 'void'),
        sig([{ name: 'visible', type: 'boolean' }, { name: 'recursive', type: 'boolean' }], 'void'),
      ]),
      m('SetHighlight', false, [sig([{ name: 'highlight', type: 'boolean' }], 'void')]),
      m('GetInteractionState', false, [sig([], 'InteractionState')]),
      m('SetInteractionState', false, [sig([{ name: 'state', type: 'InteractionState' }], 'void')]),
      m('GetMotion', false, [sig([], 'EntityMotion')]),
      m('SetMotion', false, [sig([{ name: 'motion', type: 'EntityMotion' }], 'void')]),
      m('GetPhysicalProperties', false, [sig([], 'EntityPhysicalProperties')]),
      m('SetPhysicalProperties', false, [sig([{ name: 'props', type: 'EntityPhysicalProperties' }], 'void')]),
      m('SetParent', false, [sig([{ name: 'entity', type: 'Entity' }], 'void')]),
      m('GetParent', false, [sig([], 'Entity')]),
    ],
    properties: [
      p('id', 'string', true), p('name', 'string'), p('tag', 'string'),
      p('layer', 'number'), p('active', 'boolean'),
      p('position', 'Vector3'), p('rotation', 'Quaternion'),
      p('localPosition', 'Vector3'), p('localRotation', 'Quaternion'),
      p('localScale', 'Vector3'),
      p('parent', 'Entity', true), p('children', 'Entity[]', true),
      p('childCount', 'number', true), p('transform', 'object', true),
    ],
    conditional: false,
  },

  // Entity subtypes — all follow same pattern: not constructable, static create()
  ...entitySubtype('MeshEntity', 'Custom 3D mesh entity', [
    m('LoadMesh', true, [
      sig([{ name: 'path', type: 'string' }], 'void'),
      sig([{ name: 'path', type: 'string' }, { name: 'callback', type: 'function' }], 'void'),
    ]),
    m('setMesh', false, [sig([{ name: 'data', type: 'object' }], 'void')]),
    m('setMaterial', false, [sig([{ name: 'material', type: 'object' }], 'void')]),
    m('setMaterials', false, [sig([{ name: 'materials', type: 'object[]' }], 'void')]),
    m('getMaterial', false, [sig([{ name: 'index', type: 'number' }], 'object')]),
    m('updateBounds', false, [sig([], 'void')]),
    m('createPrimitive', false, [sig([{ name: 'type', type: 'string' }], 'void')]),
  ]),
  ...entitySubtype('LightEntity', 'Light source entity', [
    m('setType', false, [sig([{ name: 'type', type: 'string' }], 'void')]),
    m('setColor', false, [sig([{ name: 'color', type: 'Color' }], 'void')]),
    m('setIntensity', false, [sig([{ name: 'intensity', type: 'number' }], 'void')]),
    m('setRange', false, [sig([{ name: 'range', type: 'number' }], 'void')]),
    m('setAngle', false, [sig([{ name: 'angle', type: 'number' }], 'void')]),
  ]),
  ...entitySubtype('TextEntity', 'Text display entity'),
  ...entitySubtype('ButtonEntity', 'Interactive button entity'),
  ...entitySubtype('ContainerEntity', 'Invisible grouping container'),
  ...entitySubtype('CanvasEntity', 'UI canvas entity'),
  ...entitySubtype('HTMLEntity', 'HTML content entity'),
  ...entitySubtype('ImageEntity', 'Image display entity'),
  ...entitySubtype('InputEntity', 'Text input entity'),
  ...entitySubtype('CharacterEntity', 'Rigged character entity'),
  ...entitySubtype('AudioEntity', 'Audio source entity'),
  ...entitySubtype('TerrainEntity', 'Terrain entity'),
  ...entitySubtype('VoxelEntity', 'Voxel-based entity'),
  ...entitySubtype('WaterEntity', 'Water surface entity'),
  ...entitySubtype('WaterBlockerEntity', 'Water blocker entity'),
  ...entitySubtype('AutomobileEntity', 'Vehicle entity — automobile'),
  ...entitySubtype('AirplaneEntity', 'Vehicle entity — airplane'),

  // Static-only APIs (singletons)
  {
    className: 'Camera',
    description: 'Camera control',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('EnableCrosshair', true, [sig([], 'void')]),
      m('DisableCrosshair', true, [sig([], 'void')]),
      m('IsCrosshairEnabled', true, [sig([], 'boolean')]),
      m('AttachToEntity', true, [sig([{ name: 'entity', type: 'Entity' }], 'void')]),
      m('SetPosition', true, [
        sig([{ name: 'position', type: 'Vector3' }], 'void'),
        sig([{ name: 'position', type: 'Vector3' }, { name: 'local', type: 'boolean' }], 'void'),
      ]),
      m('GetPosition', true, [
        sig([], 'Vector3'),
        sig([{ name: 'local', type: 'boolean' }], 'Vector3'),
      ]),
      m('SetRotation', true, [
        sig([{ name: 'rotation', type: 'Quaternion' }], 'void'),
        sig([{ name: 'rotation', type: 'Quaternion' }, { name: 'local', type: 'boolean' }], 'void'),
      ]),
      m('GetRotation', true, [
        sig([], 'Quaternion'),
        sig([{ name: 'local', type: 'boolean' }], 'Quaternion'),
      ]),
      m('SetEulerRotation', true, [
        sig([{ name: 'rotation', type: 'Vector3' }], 'void'),
        sig([{ name: 'rotation', type: 'Vector3' }, { name: 'local', type: 'boolean' }], 'void'),
      ]),
      m('GetEulerRotation', true, [
        sig([], 'Vector3'),
        sig([{ name: 'local', type: 'boolean' }], 'Vector3'),
      ]),
      m('SetScale', true, [sig([{ name: 'scale', type: 'Vector3' }], 'void')]),
      m('GetScale', true, [sig([], 'Vector3')]),
      m('AddCameraFollower', true, [sig([{ name: 'entity', type: 'Entity' }], 'void')]),
      m('RemoveCameraFollower', true, [sig([{ name: 'entity', type: 'Entity' }], 'void')]),
      m('GetRaycast', true, [sig([], 'RaycastHitInfo')]),
      m('PlaceEntityInFrontOfCamera', true, [sig([{ name: 'entity', type: 'Entity' }, { name: 'distance', type: 'number' }], 'void')]),
    ],
    properties: [],
    conditional: false,
  },

  {
    className: 'Input',
    description: 'Input handling',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('getMousePosition', true, [sig([], 'Vector2')]),
      m('isMouseButtonPressed', true, [sig([{ name: 'button', type: 'number' }], 'boolean')]),
      m('isKeyPressed', true, [sig([{ name: 'key', type: 'string' }], 'boolean')]),
      m('getMouseScrollDelta', true, [sig([], 'Vector2')]),
      m('getInputString', true, [sig([], 'string')]),
      m('getTouchCount', true, [sig([], 'number')]),
      m('getTouch', true, [sig([{ name: 'index', type: 'number' }], 'object')]),
      m('GetMoveValue', true, [sig([], 'Vector2')]),
      m('SetMovement', true, [sig([{ name: 'value', type: 'Vector2' }], 'void')]),
      m('Jump', true, [sig([], 'void')]),
      m('Lower', true, [sig([], 'void')]),
    ],
    properties: [
      p('onMouseDown', 'function'), p('onMouseUp', 'function'),
      p('onMouseMove', 'function'), p('onKeyDown', 'function'),
      p('onKeyUp', 'function'), p('onTouchStart', 'function'),
      p('onTouchEnd', 'function'),
    ],
    conditional: false,
  },

  {
    className: 'World',
    description: 'World/scene management',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('loadScene', true, [sig([{ name: 'name', type: 'string' }], 'void')]),
      m('unloadScene', true, [sig([{ name: 'name', type: 'string' }], 'void')]),
      m('getActiveScene', true, [sig([], 'string')]),
      m('setActiveScene', true, [sig([{ name: 'name', type: 'string' }], 'void')]),
      m('getSceneName', true, [sig([], 'string')]),
      m('isSceneLoaded', true, [sig([{ name: 'name', type: 'string' }], 'boolean')]),
      m('getLoadedSceneCount', true, [sig([], 'number')]),
    ],
    properties: [
      p('onSceneLoaded', 'function'), p('onSceneUnloaded', 'function'),
    ],
    conditional: false,
  },

  {
    className: 'Environment',
    description: 'Environment and lighting control',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('setSkybox', true, [sig([{ name: 'material', type: 'object' }], 'void')]),
      m('setAmbientColor', true, [sig([{ name: 'color', type: 'Color' }], 'void')]),
      m('setAmbientIntensity', true, [sig([{ name: 'intensity', type: 'number' }], 'void')]),
      m('setFogEnabled', true, [sig([{ name: 'enabled', type: 'boolean' }], 'void')]),
      m('setFogColor', true, [sig([{ name: 'color', type: 'Color' }], 'void')]),
      m('setFogDensity', true, [sig([{ name: 'density', type: 'number' }], 'void')]),
      m('setFogDistance', true, [sig([{ name: 'start', type: 'number' }, { name: 'end', type: 'number' }], 'void')]),
      m('setBloomEnabled', true, [sig([{ name: 'enabled', type: 'boolean' }], 'void')]),
      m('setBloomIntensity', true, [sig([{ name: 'intensity', type: 'number' }], 'void')]),
      m('setColorGrading', true, [sig([{ name: 'settings', type: 'object' }], 'void')]),
    ],
    properties: [],
    conditional: false,
  },

  {
    className: 'HTTPNetworking',
    description: 'HTTP request utilities',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('get', true, [sig([{ name: 'url', type: 'string' }, { name: 'callback', type: 'function' }], 'void')]),
      m('post', true, [sig([{ name: 'url', type: 'string' }, { name: 'data', type: 'object' }, { name: 'callback', type: 'function' }], 'void')]),
      m('getWithHeaders', true, [sig([{ name: 'url', type: 'string' }, { name: 'headers', type: 'object' }, { name: 'callback', type: 'function' }], 'void')]),
    ],
    properties: [],
    conditional: false,
  },

  {
    className: 'Time',
    description: 'Time management',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('setTimeScale', true, [sig([{ name: 'scale', type: 'number' }], 'void')]),
      m('setTimeout', true, [sig([{ name: 'callback', type: 'function' }, { name: 'ms', type: 'number' }], 'void')]),
      m('setInterval', true, [sig([{ name: 'callback', type: 'function' }, { name: 'ms', type: 'number' }], 'void')]),
    ],
    properties: [
      p('time', 'number', true), p('deltaTime', 'number', true),
      p('timeScale', 'number', true), p('frameCount', 'number', true),
      p('realtimeSinceStartup', 'number', true),
    ],
    conditional: false,
  },

  {
    className: 'Logging',
    description: 'Logging utilities',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('Log', true, [sig([{ name: 'message', type: 'string' }], 'void')]),
      m('LogWarning', true, [sig([{ name: 'message', type: 'string' }], 'void')]),
      m('LogError', true, [sig([{ name: 'message', type: 'string' }], 'void')]),
      m('LogIf', true, [sig([{ name: 'condition', type: 'boolean' }, { name: 'message', type: 'string' }], 'void')]),
      m('Assert', true, [sig([{ name: 'condition', type: 'boolean' }, { name: 'message', type: 'string' }], 'void')]),
      m('LogWithContext', true, [sig([{ name: 'message', type: 'string' }, { name: 'context', type: 'string' }], 'void')]),
      m('LogFormat', true, [sig([{ name: 'format', type: 'string' }, { name: 'args', type: 'any[]' }], 'void')]),
    ],
    properties: [],
    conditional: false,
  },

  {
    className: 'LocalStorage',
    description: 'Local data persistence',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('setItem', true, [sig([{ name: 'key', type: 'string' }, { name: 'value', type: 'string' }], 'void')]),
      m('getItem', true, [sig([{ name: 'key', type: 'string' }], 'string')]),
      m('removeItem', true, [sig([{ name: 'key', type: 'string' }], 'void')]),
      m('clear', true, [sig([], 'void')]),
      m('hasItem', true, [sig([{ name: 'key', type: 'string' }], 'boolean')]),
      m('getAllKeys', true, [sig([], 'string[]')]),
      m('getSize', true, [sig([], 'number')]),
    ],
    properties: [
      p('onItemSet', 'function'), p('onItemRemoved', 'function'),
    ],
    conditional: false,
  },

  {
    className: 'WorldStorage',
    description: 'World-level data persistence',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('setItem', true, [sig([{ name: 'key', type: 'string' }, { name: 'value', type: 'string' }], 'void')]),
      m('getItem', true, [sig([{ name: 'key', type: 'string' }], 'string')]),
      m('removeItem', true, [sig([{ name: 'key', type: 'string' }], 'void')]),
      m('clear', true, [sig([], 'void')]),
      m('hasItem', true, [sig([{ name: 'key', type: 'string' }], 'boolean')]),
    ],
    properties: [],
    conditional: false,
  },

  {
    className: 'AsyncJSON',
    description: 'Asynchronous JSON operations',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('parseAsync', true, [sig([{ name: 'json', type: 'string' }, { name: 'callback', type: 'function' }], 'void')]),
      m('stringifyAsync', true, [sig([{ name: 'obj', type: 'object' }, { name: 'callback', type: 'function' }], 'void')]),
    ],
    properties: [],
    conditional: false,
  },

  {
    className: 'Context',
    description: 'World context information',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('GetWorldURL', true, [sig([], 'string')]),
      m('GetPlatform', true, [sig([], 'string')]),
    ],
    properties: [],
    conditional: false,
  },

  {
    className: 'Date',
    description: 'Date and time utilities',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('now', true, [sig([], 'number')]),
      m('toString', true, [sig([], 'string')]),
    ],
    properties: [],
    conditional: false,
  },

  {
    className: 'Scripting',
    description: 'Script execution utilities',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('RunScript', true, [
        sig([{ name: 'script', type: 'string' }], 'void'),
        sig([{ name: 'script', type: 'string' }, { name: 'delay', type: 'number' }], 'void'),
        sig([{ name: 'script', type: 'string' }, { name: 'delay', type: 'number' }, { name: 'callback', type: 'function' }], 'void'),
      ]),
    ],
    properties: [],
    conditional: false,
  },

  // Conditional APIs
  {
    className: 'WebSocket',
    description: 'WebSocket connection',
    isConstructable: true,
    constructorOverloads: [sig([{ name: 'url', type: 'string' }], 'WebSocket')],
    methods: [
      m('send', false, [sig([{ name: 'data', type: 'string' }], 'void')]),
      m('close', false, [sig([], 'void')]),
    ],
    properties: [
      p('onOpen', 'function'), p('onMessage', 'function'),
      p('onClose', 'function'), p('onError', 'function'),
    ],
    conditional: true,
  },

  {
    className: 'MQTTClient',
    description: 'MQTT messaging client',
    isConstructable: true,
    constructorOverloads: [sig([{ name: 'host', type: 'string' }, { name: 'port', type: 'number' }], 'MQTTClient')],
    methods: [
      m('Connect', false, [
        sig([{ name: 'clientId', type: 'string' }], 'void'),
        sig([{ name: 'clientId', type: 'string' }, { name: 'callback', type: 'function' }], 'void'),
      ]),
      m('Subscribe', false, [sig([{ name: 'topic', type: 'string' }, { name: 'callback', type: 'function' }], 'void')]),
      m('Publish', false, [sig([{ name: 'topic', type: 'string' }, { name: 'message', type: 'string' }], 'void')]),
      m('Disconnect', false, [sig([], 'void')]),
    ],
    properties: [],
    conditional: true,
  },

  {
    className: 'SocketIO',
    description: 'Socket.IO client',
    isConstructable: true,
    constructorOverloads: [sig([{ name: 'url', type: 'string' }], 'SocketIO')],
    methods: [
      m('Connect', false, [sig([], 'void')]),
      m('On', false, [sig([{ name: 'event', type: 'string' }, { name: 'callback', type: 'function' }], 'void')]),
      m('Emit', false, [sig([{ name: 'event', type: 'string' }, { name: 'data', type: 'object' }], 'void')]),
      m('Disconnect', false, [sig([], 'void')]),
    ],
    properties: [],
    conditional: true,
  },

  {
    className: 'VOSSynchronization',
    description: 'VOS synchronization service',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('Connect', true, [sig([{ name: 'host', type: 'string' }, { name: 'port', type: 'number' }], 'void')]),
      m('Disconnect', true, [sig([], 'void')]),
    ],
    properties: [],
    conditional: true,
  },

  {
    className: 'WorldSync',
    description: 'WorldSync synchronization service',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('Connect', true, [sig([{ name: 'host', type: 'string' }, { name: 'port', type: 'number' }], 'void')]),
      m('Disconnect', true, [sig([], 'void')]),
    ],
    properties: [],
    conditional: true,
  },

  {
    className: 'Voice',
    description: 'Voice communication',
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('StartSpeaking', true, [sig([], 'void')]),
      m('StopSpeaking', true, [sig([], 'void')]),
    ],
    properties: [],
    conditional: true,
  },
];

// ── Entity subtype helper ─────────────────────────────────────────────

function entitySubtype(
  className: string,
  description: string,
  extraMethods: JsApiMethodSchema[] = [],
): [JsApiClassSchema] {
  return [{
    className,
    description,
    isConstructable: false,
    constructorOverloads: [],
    methods: [
      m('create', true, [
        sig([], className),
        sig([{ name: 'name', type: 'string' }], className),
        sig([{ name: 'name', type: 'string' }, { name: 'parent', type: 'Entity' }], className),
      ]),
      ...extraMethods,
    ],
    properties: [],
    conditional: false,
  }];
}

// ── Registry ──────────────────────────────────────────────────────────

/** All API class schemas — exported for iteration in tests and validation. */
export const API_CLASSES: readonly JsApiClassSchema[] = SCHEMAS;

const classMap = new Map<string, JsApiClassSchema>(
  SCHEMAS.map((s) => [s.className, s]),
);

/** All known API class names. */
export const API_CLASS_NAMES: readonly string[] = SCHEMAS.map((s) => s.className);

/**
 * Look up the schema for a WebVerse API class by name.
 * Returns undefined for unrecognized classes.
 */
export function getApiClass(name: string): JsApiClassSchema | undefined {
  return classMap.get(name);
}

/**
 * Check if a name is a known WebVerse API class.
 */
export function isKnownApiClass(name: string): boolean {
  return classMap.has(name);
}
