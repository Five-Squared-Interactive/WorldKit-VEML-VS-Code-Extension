// WebVerse API Types v0.1.0 — generated from JavascriptHandler.cs
// These types describe the WebVerse Runtime JavaScript API globals.
// Users should NOT edit this file; it is managed by the WorldKit extension.

// ---------------------------------------------------------------------------
// World Types — constructable math & utility primitives
// ---------------------------------------------------------------------------

declare class Vector2 {
    constructor(x: number, y: number);

    x: number;
    y: number;
    readonly magnitude: number;
    readonly sqrMagnitude: number;
    readonly normalized: Vector2;

    Normalize(): void;
    Set(x: number, y: number): void;
    ToString(): string;

    static readonly zero: Vector2;
    static readonly one: Vector2;
    static readonly up: Vector2;
    static readonly down: Vector2;
    static readonly left: Vector2;
    static readonly right: Vector2;

    static Distance(a: Vector2, b: Vector2): number;
    static Dot(a: Vector2, b: Vector2): number;
    static Angle(from: Vector2, to: Vector2): number;
    static Lerp(a: Vector2, b: Vector2, t: number): Vector2;
}

declare class Vector2D {
    constructor(x: number, y: number);

    x: number;
    y: number;
    readonly magnitude: number;
    readonly sqrMagnitude: number;
    readonly normalized: Vector2D;

    Normalize(): void;
    Set(x: number, y: number): void;
    ToString(): string;

    static readonly zero: Vector2D;
    static readonly one: Vector2D;
    static readonly up: Vector2D;
    static readonly down: Vector2D;
    static readonly left: Vector2D;
    static readonly right: Vector2D;

    static Distance(a: Vector2D, b: Vector2D): number;
    static Dot(a: Vector2D, b: Vector2D): number;
    static Angle(from: Vector2D, to: Vector2D): number;
    static Lerp(a: Vector2D, b: Vector2D, t: number): Vector2D;
}

declare class Vector2Int {
    constructor(x: number, y: number);

    x: number;
    y: number;
    readonly magnitude: number;
    readonly sqrMagnitude: number;

    Set(x: number, y: number): void;
    ToString(): string;

    static readonly zero: Vector2Int;
    static readonly one: Vector2Int;
    static readonly up: Vector2Int;
    static readonly down: Vector2Int;
    static readonly left: Vector2Int;
    static readonly right: Vector2Int;

    static Distance(a: Vector2Int, b: Vector2Int): number;
}

declare class Vector3 {
    constructor();
    constructor(x: number, y: number, z: number);

    x: number;
    y: number;
    z: number;
    readonly magnitude: number;
    readonly sqrMagnitude: number;
    readonly normalized: Vector3;

    Normalize(): void;
    Set(x: number, y: number, z: number): void;
    ToString(): string;

    static readonly zero: Vector3;
    static readonly one: Vector3;
    static readonly up: Vector3;
    static readonly down: Vector3;
    static readonly left: Vector3;
    static readonly right: Vector3;
    static readonly forward: Vector3;
    static readonly back: Vector3;

    static Cross(a: Vector3, b: Vector3): Vector3;
    static Distance(a: Vector3, b: Vector3): number;
    static Dot(a: Vector3, b: Vector3): number;
    static Lerp(a: Vector3, b: Vector3, t: number): Vector3;
    static Slerp(a: Vector3, b: Vector3, t: number): Vector3;
    static Project(vector: Vector3, onNormal: Vector3): Vector3;
}

declare class Vector3D {
    constructor();
    constructor(x: number, y: number, z: number);

    x: number;
    y: number;
    z: number;
    readonly magnitude: number;
    readonly sqrMagnitude: number;
    readonly normalized: Vector3D;

    Normalize(): void;
    Set(x: number, y: number, z: number): void;
    ToString(): string;

    static readonly zero: Vector3D;
    static readonly one: Vector3D;
    static readonly up: Vector3D;
    static readonly down: Vector3D;
    static readonly left: Vector3D;
    static readonly right: Vector3D;
    static readonly forward: Vector3D;
    static readonly back: Vector3D;

    static Cross(a: Vector3D, b: Vector3D): Vector3D;
    static Distance(a: Vector3D, b: Vector3D): number;
    static Dot(a: Vector3D, b: Vector3D): number;
    static Lerp(a: Vector3D, b: Vector3D, t: number): Vector3D;
    static Slerp(a: Vector3D, b: Vector3D, t: number): Vector3D;
    static Project(vector: Vector3D, onNormal: Vector3D): Vector3D;
}

declare class Vector3Int {
    constructor();
    constructor(x: number, y: number, z: number);

    x: number;
    y: number;
    z: number;
    readonly magnitude: number;
    readonly sqrMagnitude: number;

    Set(x: number, y: number, z: number): void;
    ToString(): string;

    static readonly zero: Vector3Int;
    static readonly one: Vector3Int;
    static readonly up: Vector3Int;
    static readonly down: Vector3Int;
    static readonly left: Vector3Int;
    static readonly right: Vector3Int;
    static readonly forward: Vector3Int;
    static readonly back: Vector3Int;

    static Distance(a: Vector3Int, b: Vector3Int): number;
}

declare class Vector4 {
    constructor(x: number, y: number, z: number, w: number);

    x: number;
    y: number;
    z: number;
    w: number;

    ToString(): string;

    static readonly zero: Vector4;
    static readonly one: Vector4;
}

declare class Vector4D {
    constructor(x: number, y: number, z: number, w: number);

    x: number;
    y: number;
    z: number;
    w: number;

    ToString(): string;

    static readonly zero: Vector4D;
    static readonly one: Vector4D;
}

declare class Vector4Int {
    constructor(x: number, y: number, z: number, w: number);

    x: number;
    y: number;
    z: number;
    w: number;

    ToString(): string;

    static readonly zero: Vector4Int;
    static readonly one: Vector4Int;
}

declare class Color {
    constructor(r: number, g: number, b: number, a?: number);

    r: number;
    g: number;
    b: number;
    a: number;

    ToString(): string;

    static readonly white: Color;
    static readonly black: Color;
    static readonly red: Color;
    static readonly green: Color;
    static readonly blue: Color;
    static readonly yellow: Color;
    static readonly cyan: Color;
    static readonly magenta: Color;
    static readonly gray: Color;
    static readonly clear: Color;

    static Lerp(a: Color, b: Color, t: number): Color;
    static HSVToRGB(h: number, s: number, v: number): Color;
    static RGBToHSV(color: Color): { h: number; s: number; v: number };
}

declare class Quaternion {
    constructor();
    constructor(x: number, y: number, z: number, w: number);

    x: number;
    y: number;
    z: number;
    w: number;
    eulerAngles: Vector3;

    ToString(): string;

    static readonly identity: Quaternion;

    static Euler(x: number, y: number, z: number): Quaternion;
    static Angle(a: Quaternion, b: Quaternion): number;
    static Dot(a: Quaternion, b: Quaternion): number;
    static Lerp(a: Quaternion, b: Quaternion, t: number): Quaternion;
    static Slerp(a: Quaternion, b: Quaternion, t: number): Quaternion;
    static LookRotation(forward: Vector3, up?: Vector3): Quaternion;
    static Inverse(q: Quaternion): Quaternion;
    static FromToRotation(from: Vector3, to: Vector3): Quaternion;
}

declare class QuaternionD {
    constructor();
    constructor(x: number, y: number, z: number, w: number);

    x: number;
    y: number;
    z: number;
    w: number;
    eulerAngles: Vector3D;

    ToString(): string;

    static readonly identity: QuaternionD;

    static Euler(x: number, y: number, z: number): QuaternionD;
    static Angle(a: QuaternionD, b: QuaternionD): number;
    static Dot(a: QuaternionD, b: QuaternionD): number;
    static Lerp(a: QuaternionD, b: QuaternionD, t: number): QuaternionD;
    static Slerp(a: QuaternionD, b: QuaternionD, t: number): QuaternionD;
    static LookRotation(forward: Vector3D, up?: Vector3D): QuaternionD;
    static Inverse(q: QuaternionD): QuaternionD;
    static FromToRotation(from: Vector3D, to: Vector3D): QuaternionD;
}

declare class UUID {
    constructor();

    ToString(): string;

    static NewUUID(): string;
}

/** Raycast hit result. Not directly constructable. */
declare class RaycastHitInfo {
    private constructor();

    readonly entity: Entity | null;
    readonly point: Vector3;
    readonly normal: Vector3;
    readonly distance: number;
}

// ---------------------------------------------------------------------------
// Enums & helper types
// ---------------------------------------------------------------------------

declare const enum InteractionState {
    Hidden = 0,
    Static = 1,
    Interactable = 2,
}

interface EntityMotion {
    angularVelocity: Vector3;
    velocity: Vector3;
    stationary: boolean;
}

interface EntityPhysicalProperties {
    angularDrag: number;
    centerOfMass: Vector3;
    drag: number;
    gravitational: boolean;
    mass: number;
}

interface LightProperties {
    type: LightType;
    color: Color;
    intensity: number;
    range: number;
}

declare const enum LightType {
    Directional = 0,
    Point = 1,
    Spot = 2,
}

declare const enum TextAlignment {
    TopLeft = 0,
    TopCenter = 1,
    TopRight = 2,
    MiddleLeft = 3,
    MiddleCenter = 4,
    MiddleRight = 5,
    BottomLeft = 6,
    BottomCenter = 7,
    BottomRight = 8,
}

declare const enum TextWrapping {
    None = 0,
    Normal = 1,
}

declare const enum UIElementAlignment {
    TopLeft = 0,
    TopCenter = 1,
    TopRight = 2,
    MiddleLeft = 3,
    MiddleCenter = 4,
    MiddleRight = 5,
    BottomLeft = 6,
    BottomCenter = 7,
    BottomRight = 8,
}

interface VoxelBlockInfo {
    type: number;
    subType: VoxelBlockSubType;
}

declare const enum VoxelBlockSubType {
    Full = 0,
    TopHalf = 1,
    BottomHalf = 2,
    NorthHalf = 3,
    SouthHalf = 4,
    EastHalf = 5,
    WestHalf = 6,
}

declare const enum AutomobileType {
    Car = 0,
    Truck = 1,
}

declare const enum TerrainEntityBrushType {
    Circle = 0,
    Square = 1,
}

interface TerrainEntityLayer {
    diffuse: string;
    normal: string;
    mask: string;
    specular: Color;
    metallic: number;
    smoothness: number;
    tileSize: Vector2;
    tileOffset: Vector2;
}

interface TerrainEntityLayerMask {
    weights: number[];
}

interface TerrainEntityLayerMaskCollection {
    masks: TerrainEntityLayerMask[];
}

interface TerrainEntityModification {
    operation: TerrainEntityOperation;
    position: Vector3;
    brushType: TerrainEntityBrushType;
    layer: number;
    size: number;
    strength: number;
}

declare const enum TerrainEntityOperation {
    Raise = 0,
    Lower = 1,
    Flatten = 2,
    Paint = 3,
}

interface AutomobileEntityWheel {
    position: Vector3;
    rotation: Quaternion;
}

// ---------------------------------------------------------------------------
// Entity types — not directly constructable, use static create methods
// ---------------------------------------------------------------------------

declare class Entity {
    protected constructor();

    readonly id: string;
    name: string;
    tag: string;
    layer: number;
    active: boolean;
    position: Vector3;
    rotation: Quaternion;
    localPosition: Vector3;
    localRotation: Quaternion;
    localScale: Vector3;
    parent: Entity | null;
    readonly children: Entity[];
    readonly childCount: number;
    readonly transform: {
        position: Vector3;
        rotation: Quaternion;
        localPosition: Vector3;
        localRotation: Quaternion;
        localScale: Vector3;
    };

    static Get(idOrTag: string): Entity | null;
    static create(name?: string, parent?: Entity): Entity;
    static createWithTransform(name: string, transform: any): Entity;

    destroy(): void;
    setActive(active: boolean): void;
    isActive(): boolean;
    setParent(parent: Entity | null): void;
    addChild(child: Entity): void;
    removeChild(child: Entity): void;
    getChild(index: number): Entity | null;
    findChild(name: string): Entity | null;
    addComponent(type: string): any;
    getComponent(type: string): any;
    hasComponent(type: string): boolean;
    removeComponent(type: string): void;
    setProperty(name: string, value: any): void;
    getProperty(name: string): any;
    hasProperty(name: string): boolean;
    removeProperty(name: string): void;

    SetVisibility(visible: boolean, recursive?: boolean): void;
    SetHighlight(highlight: boolean): void;
    GetInteractionState(): InteractionState;
    SetInteractionState(state: InteractionState): void;
    GetMotion(): EntityMotion;
    SetMotion(motion: EntityMotion): void;
    GetPhysicalProperties(): EntityPhysicalProperties;
    SetPhysicalProperties(props: EntityPhysicalProperties): void;
    SetParent(entity: Entity | null): void;
    GetParent(): Entity | null;

    /** Collision callback — assign a function to receive collision events. */
    onCollisionEnter: ((other: Entity) => void) | null;
    onCollisionStay: ((other: Entity) => void) | null;
    onCollisionExit: ((other: Entity) => void) | null;
}

declare class MeshEntity extends Entity {
    protected constructor();

    mesh: any;
    materials: any[];
    readonly bounds: { center: Vector3; size: Vector3 };
    readonly vertexCount: number;
    readonly triangleCount: number;

    static create(name?: string, parent?: Entity): MeshEntity;
    static LoadMesh(
        path: string,
        callback?: (entity: MeshEntity) => void
    ): void;

    setMesh(data: any): void;
    setMaterial(material: any): void;
    setMaterials(materials: any[]): void;
    getMaterial(index: number): any;
    updateBounds(): void;
    createPrimitive(type: string): void;
    createFromVertices(vertices: Vector3[], triangles: number[]): void;
}

declare class LightEntity extends Entity {
    protected constructor();

    type: LightType;
    color: Color;
    intensity: number;
    range: number;
    angle: number;

    static create(): LightEntity;

    setType(type: LightType): void;
    setColor(color: Color): void;
    setIntensity(intensity: number): void;
    setRange(range: number): void;
    setAngle(angle: number): void;
}

declare class TextEntity extends Entity {
    protected constructor();

    content: string;
    fontSize: number;
    color: Color;

    static create(): TextEntity;
}

declare class ButtonEntity extends Entity {
    protected constructor();
    static create(): ButtonEntity;
}

declare class ContainerEntity extends Entity {
    protected constructor();
    static create(): ContainerEntity;
}

declare class CanvasEntity extends Entity {
    protected constructor();
    static create(): CanvasEntity;
}

declare class HTMLEntity extends Entity {
    protected constructor();
    static create(): HTMLEntity;
}

declare class ImageEntity extends Entity {
    protected constructor();
    static create(): ImageEntity;
}

declare class InputEntity extends Entity {
    protected constructor();
    static create(): InputEntity;
}

declare class CharacterEntity extends Entity {
    protected constructor();
    static create(): CharacterEntity;
}

declare class AudioEntity extends Entity {
    protected constructor();
    static create(): AudioEntity;
}

declare class TerrainEntity extends Entity {
    protected constructor();
    static create(): TerrainEntity;
}

declare class VoxelEntity extends Entity {
    protected constructor();
    static create(): VoxelEntity;
}

declare class WaterEntity extends Entity {
    protected constructor();
    static create(): WaterEntity;
}

declare class WaterBlockerEntity extends Entity {
    protected constructor();
    static create(): WaterBlockerEntity;
}

declare class AutomobileEntity extends Entity {
    protected constructor();
    static create(): AutomobileEntity;
}

declare class AirplaneEntity extends Entity {
    protected constructor();
    static create(): AirplaneEntity;
}

// ---------------------------------------------------------------------------
// Singleton / static-only APIs — not constructable
// ---------------------------------------------------------------------------

declare namespace Camera {
    function EnableCrosshair(): void;
    function DisableCrosshair(): void;
    function IsCrosshairEnabled(): boolean;
    function AttachToEntity(entity: Entity | null): void;
    function SetPosition(pos: Vector3, local?: boolean): void;
    function GetPosition(local?: boolean): Vector3;
    function SetRotation(rot: Quaternion, local?: boolean): void;
    function GetRotation(local?: boolean): Quaternion;
    function SetEulerRotation(rot: Vector3, local?: boolean): void;
    function GetEulerRotation(local?: boolean): Vector3;
    function SetScale(scale: Vector3): void;
    function GetScale(): Vector3;
    function AddCameraFollower(entity: Entity): void;
    function RemoveCameraFollower(entity: Entity): void;
    function GetRaycast(): RaycastHitInfo | null;
    function PlaceEntityInFrontOfCamera(
        entity: Entity,
        distance: number
    ): void;
}

declare namespace Input {
    let onMouseDown: ((button: number) => void) | null;
    let onMouseUp: ((button: number) => void) | null;
    let onMouseMove: ((position: Vector2) => void) | null;
    let onKeyDown: ((key: string) => void) | null;
    let onKeyUp: ((key: string) => void) | null;
    let onTouchStart: ((touch: any) => void) | null;
    let onTouchEnd: ((touch: any) => void) | null;

    function getMousePosition(): Vector2;
    function isMouseButtonPressed(button: number): boolean;
    function isKeyPressed(key: string): boolean;
    function getMouseScrollDelta(): Vector2;
    function getInputString(): string;
    function getTouchCount(): number;
    function getTouch(index: number): any;
    function GetMoveValue(): Vector2;
    function SetMovement(value: Vector2): void;
    function Jump(): void;
    function Lower(): void;
}

declare namespace World {
    function loadScene(name: string): void;
    function unloadScene(name: string): void;
    function getActiveScene(): string;
    function setActiveScene(name: string): void;
    function getSceneName(): string;
    function isSceneLoaded(name: string): boolean;
    function getLoadedSceneCount(): number;

    let onSceneLoaded: ((sceneName: string) => void) | null;
    let onSceneUnloaded: ((sceneName: string) => void) | null;
}

declare namespace Environment {
    function setSkybox(material: any): void;
    function setAmbientColor(color: Color): void;
    function setAmbientIntensity(intensity: number): void;
    function setFogEnabled(enabled: boolean): void;
    function setFogColor(color: Color): void;
    function setFogDensity(density: number): void;
    function setFogDistance(start: number, end: number): void;
    function setBloomEnabled(enabled: boolean): void;
    function setBloomIntensity(intensity: number): void;
    function setColorGrading(settings: any): void;
}

declare namespace HTTPNetworking {
    function get(url: string, callback: (response: any) => void): void;
    function post(
        url: string,
        data: any,
        callback: (response: any) => void
    ): void;
    function getWithHeaders(
        url: string,
        headers: any,
        callback: (response: any) => void
    ): void;
}

declare namespace Time {
    const time: number;
    const deltaTime: number;
    let timeScale: number;
    const frameCount: number;
    const realtimeSinceStartup: number;

    function setTimeScale(scale: number): void;
    function setTimeout(callback: () => void, ms: number): void;
    function setInterval(callback: () => void, ms: number): void;
}

declare namespace Logging {
    function Log(message: string): void;
    function LogWarning(message: string): void;
    function LogError(message: string): void;
    function LogIf(condition: boolean, message: string): void;
    function Assert(condition: boolean, message: string): void;
    function LogWithContext(message: string, context: string): void;
    function LogFormat(format: string, ...args: any[]): void;
}

declare namespace LocalStorage {
    function setItem(key: string, value: string): void;
    function getItem(key: string): string | null;
    function removeItem(key: string): void;
    function clear(): void;
    function hasItem(key: string): boolean;
    function getAllKeys(): string[];
    function getSize(): number;

    let onItemSet: ((key: string, value: string) => void) | null;
    let onItemRemoved: ((key: string) => void) | null;
}

declare namespace WorldStorage {
    function setItem(key: string, value: string): void;
    function getItem(key: string): string | null;
    function removeItem(key: string): void;
    function clear(): void;
    function hasItem(key: string): boolean;
    function getAllKeys(): string[];
    function getSize(): number;

    let onItemSet: ((key: string, value: string) => void) | null;
    let onItemRemoved: ((key: string) => void) | null;
}

declare namespace AsyncJSON {
    function parseAsync(
        json: string,
        callback: (result: {
            success: boolean;
            data?: any;
            error?: string;
        }) => void
    ): void;
    function stringifyAsync(
        obj: any,
        callback: (result: {
            success: boolean;
            data?: string;
            error?: string;
        }) => void
    ): void;
}

declare namespace Context {
    function GetWorldURL(): string;
    function GetPlatform(): string;
}

declare namespace Date {
    function now(): number;
    function toString(): string;
}

declare namespace Scripting {
    function RunScript(
        script: string,
        delay?: number,
        callback?: (result: any) => void
    ): void;
}

// ---------------------------------------------------------------------------
// Conditional APIs — available only when the runtime is compiled with
// the corresponding feature flags (e.g. USE_WEBINTERFACE).
// ---------------------------------------------------------------------------

/**
 * @conditional Requires USE_WEBINTERFACE.
 * WebSocket client for bidirectional communication.
 */
declare class WebSocket {
    constructor(url: string);

    onOpen: (() => void) | null;
    onMessage: ((data: string) => void) | null;
    onClose: (() => void) | null;
    onError: ((error: string) => void) | null;

    send(data: string): void;
    close(): void;
}

/**
 * @conditional Requires USE_WEBINTERFACE.
 * MQTT publish/subscribe client.
 */
declare class MQTTClient {
    constructor(host: string, port: number);

    Connect(clientId: string, callback?: () => void): void;
    Subscribe(topic: string, callback: (message: string) => void): void;
    Publish(topic: string, message: string): void;
    Disconnect(): void;
}

/**
 * @conditional Requires USE_WEBINTERFACE.
 * Socket.IO client for real-time event-based communication.
 */
declare class SocketIO {
    constructor(url: string);

    Connect(callback?: () => void): void;
    Disconnect(): void;
    Emit(eventName: string, data: any): void;
    On(eventName: string, callback: (data: any) => void): void;
    Off(eventName: string): void;
}

/**
 * @conditional Requires USE_WEBINTERFACE.
 * VOS synchronization API for multiplayer state.
 */
declare namespace VOSSynchronization {
    function Connect(
        host: string,
        port: number,
        transport: VSSTransport,
        callback?: () => void
    ): void;
    function Disconnect(): void;
}

/** @conditional Transport enum for VOSSynchronization. */
declare const enum VSSTransport {
    TCP = 0,
    WebSocket = 1,
}

/**
 * @conditional Requires USE_WEBINTERFACE.
 * WorldSync API for world-level entity synchronization.
 */
declare namespace WorldSync {
    function Connect(
        host: string,
        port: number,
        transport: WSyncTransport,
        callback?: () => void
    ): void;
    function Disconnect(): void;
}

/** @conditional Transport enum for WorldSync. */
declare const enum WSyncTransport {
    TCP = 0,
    WebSocket = 1,
}

/**
 * @conditional Voice communication API.
 */
declare namespace Voice {
    function StartSpeaking(): void;
    function StopSpeaking(): void;
}
