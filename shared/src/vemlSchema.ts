/**
 * VEML 3.0 element schema definitions.
 * Static data structure describing valid elements, their attributes, and nesting rules.
 * Based on the VEML 3.0 XSD schema (http://www.fivesqd.com/schemas/veml/3.0).
 */

export interface VemlOptionalAttribute {
  readonly name: string;
  readonly type: string;
  readonly description: string;
  readonly enumValues?: readonly string[];
}

export interface VemlElementSchema {
  readonly tagName: string;
  readonly description: string;
  readonly allowedChildren: readonly string[];
  readonly requiredAttributes: readonly string[];
  readonly optionalAttributes: readonly VemlOptionalAttribute[];
  readonly allowedParents: readonly string[];
}

// ── Entity type element names ──────────────────────────────────────

const ENTITY_TYPE_NAMES = [
  'container', 'audio', 'mesh', 'cubemesh', 'spheremesh', 'capsulemesh',
  'cylindermesh', 'planemesh', 'torusmesh', 'conemesh', 'rectangularpyramidmesh',
  'tetrahedronmesh', 'prismmesh', 'archmesh', 'character', 'canvas', 'html',
  'button', 'input', 'image', 'light', 'terrain', 'text', 'voxel', 'water',
  'automobile', 'airplane', 'waterblocker',
] as const;

/** Children common to all entity types (transforms, nested entities, etc.) */
const ENTITY_CHILDREN: readonly string[] = [
  'scaletransform', 'sizetransform', 'canvastransform',
  'synchronizer', 'placement-socket',
  ...ENTITY_TYPE_NAMES,
];

/** Base attributes shared by all entity types. */
const BASE_ENTITY_OPTIONAL_ATTRS: readonly VemlOptionalAttribute[] = [
  { name: 'tag', type: 'string', description: 'Entity tag for grouping/identification' },
  { name: 'id', type: 'string', description: 'Unique entity identifier' },
  { name: 'on-load-event', type: 'string', description: 'Event to fire when entity loads' },
];

// ── Helper to create entity type schemas ───────────────────────────

function entitySchema(
  tagName: string,
  description: string,
  extraOptional: readonly VemlOptionalAttribute[] = [],
): VemlElementSchema {
  return {
    tagName,
    description,
    allowedChildren: [...ENTITY_CHILDREN],
    requiredAttributes: [],
    optionalAttributes: [...BASE_ENTITY_OPTIONAL_ATTRS, ...extraOptional],
    allowedParents: ['environment', ...ENTITY_TYPE_NAMES],
  };
}

// ── Schema Definitions ─────────────────────────────────────────────

const SCHEMAS: VemlElementSchema[] = [
  // Root
  {
    tagName: 'veml',
    description: 'Root element of a VEML 3.0 document',
    allowedChildren: ['metadata', 'environment'],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: [],
  },

  // Metadata section
  {
    tagName: 'metadata',
    description: 'Document metadata container (title, capabilities, scripts)',
    allowedChildren: ['title', 'capability', 'script', 'inputevent', 'controlflags', 'synchronizationservice'],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: ['veml'],
  },
  {
    tagName: 'title',
    description: 'World title displayed to users',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: ['metadata'],
  },
  {
    tagName: 'capability',
    description: 'Declares a required runtime capability',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'name', type: 'string', description: 'Capability name' },
    ],
    allowedParents: ['metadata'],
  },
  {
    tagName: 'script',
    description: 'Script reference — text content is the script file path (e.g., Scripts/index.js) or inline JavaScript',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: ['metadata'],
  },
  {
    tagName: 'inputevent',
    description: 'Input event definition',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'name', type: 'string', description: 'Event name' },
      { name: 'input', type: 'string', description: 'Input binding' },
    ],
    allowedParents: ['metadata'],
  },
  {
    tagName: 'controlflags',
    description: 'Control flags for the world runtime',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'third-person', type: 'boolean', description: 'Enable third-person camera' },
      { name: 'vr-mode', type: 'boolean', description: 'Enable VR mode' },
    ],
    allowedParents: ['metadata'],
  },
  {
    tagName: 'synchronizationservice',
    description: 'Synchronization service configuration for multiplayer',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'type', type: 'string', description: 'Service type' },
      { name: 'host', type: 'string', description: 'Service host URL' },
      { name: 'port', type: 'string', description: 'Service port' },
    ],
    allowedParents: ['metadata'],
  },

  // Environment section
  {
    tagName: 'environment',
    description: 'World environment container (background, effects, entities)',
    allowedChildren: ['background', 'effects', ...ENTITY_TYPE_NAMES],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: ['veml'],
  },

  // Background
  {
    tagName: 'background',
    description: 'Background configuration (panorama, color, or procedural sky)',
    allowedChildren: ['panorama', 'color', 'lite-procedural-sky'],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: ['environment'],
  },
  {
    tagName: 'panorama',
    description: 'Panoramic skybox background',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'src', type: 'string', description: 'Panorama image source' },
    ],
    allowedParents: ['background'],
  },
  {
    tagName: 'color',
    description: 'Solid color background',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'r', type: 'number', description: 'Red component (0-1)' },
      { name: 'g', type: 'number', description: 'Green component (0-1)' },
      { name: 'b', type: 'number', description: 'Blue component (0-1)' },
    ],
    allowedParents: ['background'],
  },
  {
    tagName: 'lite-procedural-sky',
    description: 'Lightweight procedural sky background',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'top-color', type: 'string', description: 'Sky top color' },
      { name: 'horizon-color', type: 'string', description: 'Horizon color' },
      { name: 'bottom-color', type: 'string', description: 'Ground color' },
    ],
    allowedParents: ['background'],
  },

  // Effects
  {
    tagName: 'effects',
    description: 'Visual effects container',
    allowedChildren: ['lite-fog'],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: ['environment'],
  },
  {
    tagName: 'lite-fog',
    description: 'Lightweight fog effect',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'color', type: 'string', description: 'Fog color' },
      { name: 'density', type: 'number', description: 'Fog density' },
    ],
    allowedParents: ['effects'],
  },

  // Entity types
  entitySchema('container', 'Invisible grouping container for organizing child entities'),
  entitySchema('audio', 'Audio source entity', [
    { name: 'src', type: 'string', description: 'Audio source file path' },
    { name: 'volume', type: 'number', description: 'Playback volume (0-1)' },
    { name: 'loop', type: 'boolean', description: 'Loop playback' },
  ]),
  entitySchema('mesh', 'Custom 3D mesh entity', [
    { name: 'src', type: 'string', description: 'Mesh source file path (glb/gltf)' },
    { name: 'visible', type: 'boolean', description: 'Mesh visibility' },
    { name: 'static', type: 'boolean', description: 'Static mesh (no physics updates)' },
    { name: 'interaction-layer', type: 'string', description: 'Interaction layer name' },
  ]),
  entitySchema('cubemesh', 'Built-in cube mesh primitive'),
  entitySchema('spheremesh', 'Built-in sphere mesh primitive'),
  entitySchema('capsulemesh', 'Built-in capsule mesh primitive'),
  entitySchema('cylindermesh', 'Built-in cylinder mesh primitive'),
  entitySchema('planemesh', 'Built-in plane mesh primitive'),
  entitySchema('torusmesh', 'Built-in torus mesh primitive'),
  entitySchema('conemesh', 'Built-in cone mesh primitive'),
  entitySchema('rectangularpyramidmesh', 'Built-in rectangular pyramid mesh primitive'),
  entitySchema('tetrahedronmesh', 'Built-in tetrahedron mesh primitive'),
  entitySchema('prismmesh', 'Built-in prism mesh primitive'),
  entitySchema('archmesh', 'Built-in arch mesh primitive'),
  entitySchema('character', 'Rigged character entity with avatar support', [
    { name: 'src', type: 'string', description: 'Character model source file' },
  ]),
  entitySchema('canvas', 'UI canvas entity for HTML/UI overlays', [
    { name: 'src', type: 'string', description: 'Canvas content source' },
  ]),
  entitySchema('html', 'HTML content entity'),
  entitySchema('button', 'Interactive button entity', [
    { name: 'label', type: 'string', description: 'Button label text' },
    { name: 'on-click', type: 'string', description: 'Click event handler' },
  ]),
  entitySchema('input', 'Text input entity', [
    { name: 'placeholder', type: 'string', description: 'Placeholder text' },
  ]),
  entitySchema('image', 'Image display entity', [
    { name: 'src', type: 'string', description: 'Image source file path' },
  ]),
  entitySchema('light', 'Light source entity', [
    { name: 'type', type: 'string', description: 'Light type', enumValues: ['directional', 'point', 'spot'] },
    { name: 'intensity', type: 'number', description: 'Light intensity' },
    { name: 'color', type: 'string', description: 'Light color' },
    { name: 'range', type: 'number', description: 'Light range (point/spot)' },
  ]),
  entitySchema('terrain', 'Terrain entity', [
    { name: 'src', type: 'string', description: 'Terrain heightmap source' },
  ]),
  entitySchema('text', 'Text display entity', [
    { name: 'content', type: 'string', description: 'Text content' },
    { name: 'font-size', type: 'number', description: 'Font size' },
  ]),
  entitySchema('voxel', 'Voxel-based entity'),
  entitySchema('water', 'Water surface entity'),
  entitySchema('automobile', 'Vehicle entity — automobile'),
  entitySchema('airplane', 'Vehicle entity — airplane'),
  entitySchema('waterblocker', 'Water blocking entity'),

  // Transform types
  {
    tagName: 'scaletransform',
    description: 'Transform with position, rotation, and scale',
    allowedChildren: ['position', 'rotation', 'scale'],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: [...ENTITY_TYPE_NAMES],
  },
  {
    tagName: 'sizetransform',
    description: 'Transform with position, rotation, and size',
    allowedChildren: ['position', 'rotation', 'size'],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: [...ENTITY_TYPE_NAMES],
  },
  {
    tagName: 'canvastransform',
    description: 'Canvas-specific transform with percentage-based positioning',
    allowedChildren: ['position-percent', 'size-percent'],
    requiredAttributes: [],
    optionalAttributes: [],
    allowedParents: [...ENTITY_TYPE_NAMES],
  },
  {
    tagName: 'position',
    description: 'Position in 3D space',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'x', type: 'number', description: 'X coordinate' },
      { name: 'y', type: 'number', description: 'Y coordinate' },
      { name: 'z', type: 'number', description: 'Z coordinate' },
    ],
    allowedParents: ['scaletransform', 'sizetransform'],
  },
  {
    tagName: 'rotation',
    description: 'Rotation as quaternion (x, y, z, w)',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'x', type: 'number', description: 'X rotation component' },
      { name: 'y', type: 'number', description: 'Y rotation component' },
      { name: 'z', type: 'number', description: 'Z rotation component' },
      { name: 'w', type: 'number', description: 'W rotation component' },
    ],
    allowedParents: ['scaletransform', 'sizetransform'],
  },
  {
    tagName: 'scale',
    description: 'Scale in 3D space',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'x', type: 'number', description: 'X scale' },
      { name: 'y', type: 'number', description: 'Y scale' },
      { name: 'z', type: 'number', description: 'Z scale' },
    ],
    allowedParents: ['scaletransform'],
  },
  {
    tagName: 'size',
    description: 'Size dimensions',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'x', type: 'number', description: 'X size' },
      { name: 'y', type: 'number', description: 'Y size' },
      { name: 'z', type: 'number', description: 'Z size' },
    ],
    allowedParents: ['sizetransform'],
  },
  {
    tagName: 'position-percent',
    description: 'Canvas position as percentage',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'x', type: 'number', description: 'X position percentage' },
      { name: 'y', type: 'number', description: 'Y position percentage' },
    ],
    allowedParents: ['canvastransform'],
  },
  {
    tagName: 'size-percent',
    description: 'Canvas size as percentage',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'x', type: 'number', description: 'Width percentage' },
      { name: 'y', type: 'number', description: 'Height percentage' },
    ],
    allowedParents: ['canvastransform'],
  },

  // Entity children (non-transform)
  {
    tagName: 'synchronizer',
    description: 'Network synchronization component for multiplayer',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'type', type: 'string', description: 'Synchronization type' },
    ],
    allowedParents: [...ENTITY_TYPE_NAMES],
  },
  {
    tagName: 'placement-socket',
    description: 'Attachment point for placing objects on this entity',
    allowedChildren: [],
    requiredAttributes: [],
    optionalAttributes: [
      { name: 'name', type: 'string', description: 'Socket name' },
    ],
    allowedParents: [...ENTITY_TYPE_NAMES],
  },
];

// ── Registry ───────────────────────────────────────────────────────

/** All element schemas — exported for iteration in tests and completion providers. */
export const ELEMENT_SCHEMAS: readonly VemlElementSchema[] = SCHEMAS;

const schemaMap = new Map<string, VemlElementSchema>(
  SCHEMAS.map((s) => [s.tagName, s]),
);

/** All valid VEML element names. */
export const VALID_ELEMENT_NAMES: readonly string[] = SCHEMAS.map((s) => s.tagName);

/**
 * Look up the schema for a VEML element by tag name.
 * Returns undefined for unrecognized elements.
 */
export function getElementSchema(tagName: string): VemlElementSchema | undefined {
  return schemaMap.get(tagName.toLowerCase());
}

/** All entity-type element names. */
export const ENTITY_TYPE_ELEMENT_NAMES: readonly string[] = [...ENTITY_TYPE_NAMES];
