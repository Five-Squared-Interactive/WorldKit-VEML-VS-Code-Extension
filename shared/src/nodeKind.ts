/**
 * Discriminant enum for VEML 3.0 AST node types.
 * Maps 1:1 with VEML element names plus special types for errors and unknown elements.
 */
export enum NodeKind {
  // Root
  Veml = 'Veml',

  // Metadata section
  Metadata = 'Metadata',
  Title = 'Title',
  Capability = 'Capability',
  Script = 'Script',
  InputEvent = 'InputEvent',
  ControlFlags = 'ControlFlags',
  SynchronizationService = 'SynchronizationService',

  // Environment section
  Environment = 'Environment',

  // Background
  Background = 'Background',
  Panorama = 'Panorama',
  Color = 'Color',
  LiteProceduralSky = 'LiteProceduralSky',

  // Effects
  Effects = 'Effects',
  LiteFog = 'LiteFog',

  // Entity types (all extend base entity)
  Container = 'Container',
  Audio = 'Audio',
  Mesh = 'Mesh',
  CubeMesh = 'CubeMesh',
  SphereMesh = 'SphereMesh',
  CapsuleMesh = 'CapsuleMesh',
  CylinderMesh = 'CylinderMesh',
  PlaneMesh = 'PlaneMesh',
  TorusMesh = 'TorusMesh',
  ConeMesh = 'ConeMesh',
  RectangularPyramidMesh = 'RectangularPyramidMesh',
  TetrahedronMesh = 'TetrahedronMesh',
  PrismMesh = 'PrismMesh',
  ArchMesh = 'ArchMesh',
  Character = 'Character',
  Canvas = 'Canvas',
  Html = 'Html',
  Button = 'Button',
  Input = 'Input',
  Image = 'Image',
  Light = 'Light',
  Terrain = 'Terrain',
  Text = 'Text',
  Voxel = 'Voxel',
  Water = 'Water',
  Automobile = 'Automobile',
  Airplane = 'Airplane',
  WaterBlocker = 'WaterBlocker',

  // Transform types
  ScaleTransform = 'ScaleTransform',
  SizeTransform = 'SizeTransform',
  CanvasTransform = 'CanvasTransform',
  Position = 'Position',
  Rotation = 'Rotation',
  Scale = 'Scale',
  Size = 'Size',
  PositionPercent = 'PositionPercent',
  SizePercent = 'SizePercent',

  // Entity children
  Synchronizer = 'Synchronizer',
  PlacementSocket = 'PlacementSocket',

  // Special
  Error = 'Error',
  Unknown = 'Unknown',

  // Structural (non-element nodes)
  Document = 'Document',
  Comment = 'Comment',
  CData = 'CData',
  ProcessingInstruction = 'ProcessingInstruction',
}

/** All entity-type NodeKinds. Used to identify any entity node regardless of specific type. */
export const ENTITY_NODE_KINDS = new Set<NodeKind>([
  NodeKind.Container,
  NodeKind.Audio,
  NodeKind.Mesh,
  NodeKind.CubeMesh,
  NodeKind.SphereMesh,
  NodeKind.CapsuleMesh,
  NodeKind.CylinderMesh,
  NodeKind.PlaneMesh,
  NodeKind.TorusMesh,
  NodeKind.ConeMesh,
  NodeKind.RectangularPyramidMesh,
  NodeKind.TetrahedronMesh,
  NodeKind.PrismMesh,
  NodeKind.ArchMesh,
  NodeKind.Character,
  NodeKind.Canvas,
  NodeKind.Html,
  NodeKind.Button,
  NodeKind.Input,
  NodeKind.Image,
  NodeKind.Light,
  NodeKind.Terrain,
  NodeKind.Text,
  NodeKind.Voxel,
  NodeKind.Water,
  NodeKind.Automobile,
  NodeKind.Airplane,
  NodeKind.WaterBlocker,
]);

/** Map from lowercase VEML element name to NodeKind. */
const TAG_TO_KIND: Readonly<Record<string, NodeKind>> = {
  veml: NodeKind.Veml,
  metadata: NodeKind.Metadata,
  title: NodeKind.Title,
  capability: NodeKind.Capability,
  script: NodeKind.Script,
  inputevent: NodeKind.InputEvent,
  controlflags: NodeKind.ControlFlags,
  synchronizationservice: NodeKind.SynchronizationService,
  environment: NodeKind.Environment,
  background: NodeKind.Background,
  panorama: NodeKind.Panorama,
  color: NodeKind.Color,
  'lite-procedural-sky': NodeKind.LiteProceduralSky,
  effects: NodeKind.Effects,
  'lite-fog': NodeKind.LiteFog,
  container: NodeKind.Container,
  audio: NodeKind.Audio,
  mesh: NodeKind.Mesh,
  cubemesh: NodeKind.CubeMesh,
  spheremesh: NodeKind.SphereMesh,
  capsulemesh: NodeKind.CapsuleMesh,
  cylindermesh: NodeKind.CylinderMesh,
  planemesh: NodeKind.PlaneMesh,
  torusmesh: NodeKind.TorusMesh,
  conemesh: NodeKind.ConeMesh,
  rectangularpyramidmesh: NodeKind.RectangularPyramidMesh,
  tetrahedronmesh: NodeKind.TetrahedronMesh,
  prismmesh: NodeKind.PrismMesh,
  archmesh: NodeKind.ArchMesh,
  character: NodeKind.Character,
  canvas: NodeKind.Canvas,
  html: NodeKind.Html,
  button: NodeKind.Button,
  input: NodeKind.Input,
  image: NodeKind.Image,
  light: NodeKind.Light,
  terrain: NodeKind.Terrain,
  text: NodeKind.Text,
  voxel: NodeKind.Voxel,
  water: NodeKind.Water,
  automobile: NodeKind.Automobile,
  airplane: NodeKind.Airplane,
  waterblocker: NodeKind.WaterBlocker,
  scaletransform: NodeKind.ScaleTransform,
  sizetransform: NodeKind.SizeTransform,
  canvastransform: NodeKind.CanvasTransform,
  position: NodeKind.Position,
  rotation: NodeKind.Rotation,
  scale: NodeKind.Scale,
  size: NodeKind.Size,
  'position-percent': NodeKind.PositionPercent,
  'size-percent': NodeKind.SizePercent,
  synchronizer: NodeKind.Synchronizer,
  'placement-socket': NodeKind.PlacementSocket,
};

/**
 * Resolve an element tag name to a NodeKind.
 * Returns NodeKind.Unknown for unrecognized tags.
 */
export function tagNameToKind(tagName: string): NodeKind {
  return TAG_TO_KIND[tagName.toLowerCase()] ?? NodeKind.Unknown;
}
