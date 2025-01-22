import { Buffer } from 'node:buffer';
import { AnimationClip, BufferAttribute, Camera, Group, InterleavedBufferAttribute, Loader, LoadingManager, Material, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Texture } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from './DRACOLoader.js';
import { FileLoader } from './FileLoader.js';
import { TextureLoader } from './TextureLoader.js';
export interface GLTF {
    animations: AnimationClip[];
    scene: Group;
    scenes: Group[];
    cameras: Camera[];
    asset: {
        copyright?: string;
        generator?: string;
        version?: string;
        minVersion?: string;
        extensions?: any;
        extras?: any;
    };
    parser: GLTFParser;
    userData: any;
}
export interface GLTFLoaderPlugin {
    beforeRoot?: (() => Promise<void> | null) | undefined;
    afterRoot?: ((result: GLTF) => Promise<void> | null) | undefined;
    loadMesh?: ((meshIndex: number) => Promise<Group | Mesh | SkinnedMesh> | null) | undefined;
    loadBufferView?: ((bufferViewIndex: number) => Promise<ArrayBuffer> | null) | undefined;
    loadMaterial?: ((materialIndex: number) => Promise<Material> | null) | undefined;
    loadTexture?: ((textureIndex: number) => Promise<Texture> | null) | undefined;
    getMaterialType?: ((materialIndex: number) => typeof Material | null) | undefined;
    extendMaterialParams?: ((materialIndex: number, materialParams: {
        [key: string]: any;
    }) => Promise<any> | null) | undefined;
    createNodeMesh?: ((nodeIndex: number) => Promise<Group | Mesh | SkinnedMesh> | null) | undefined;
    createNodeAttachment?: ((nodeIndex: number) => Promise<Object3D> | null) | undefined;
}
export declare class GLTFLoader extends Loader {
    static LOG_TEXTURE_LOAD_ERROR: boolean;
    dracoLoader: DRACOLoader;
    ktx2Loader: any;
    meshoptDecoder: any;
    pluginCallbacks: any[];
    constructor(manager?: LoadingManager);
    load(url: string, onLoad: (gltf: GLTF) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: Error) => void): void;
    setDRACOLoader(dracoLoader: DRACOLoader): GLTFLoader;
    setDDSLoader(): void;
    setKTX2Loader(ktx2Loader: KTX2Loader): GLTFLoader;
    setMeshoptDecoder(meshoptDecoder: any): GLTFLoader;
    register(callback: (parser: GLTFParser) => GLTFLoaderPlugin): GLTFLoader;
    unregister(callback: (parser: GLTFParser) => GLTFLoaderPlugin): GLTFLoader;
    parse(data: Buffer | ArrayBuffer | string, path: string, onLoad: (gltf: GLTF) => void, onError?: (err: Error) => void): void;
    parseAsync(data: any, path: any): Promise<unknown>;
}
declare class GLTFParser {
    json: {
        [key: string]: any;
    };
    extensions: {};
    plugins: {};
    options: {
        [key: string]: any;
    };
    cache: any;
    associations: Map<any, any>;
    primitiveCache: {};
    meshCache: {
        refs: {};
        uses: {};
    };
    cameraCache: {
        refs: {};
        uses: {};
    };
    lightCache: {
        refs: {};
        uses: {};
    };
    sourceCache: {};
    textureCache: {};
    nodeNamesUsed: {};
    textureLoader: TextureLoader;
    fileLoader: FileLoader;
    constructor(json?: {
        [key: string]: any;
    }, options?: {
        [key: string]: any;
    });
    setExtensions(extensions: any): void;
    setPlugins(plugins: any): void;
    parse(onLoad: any, onError: any): void;
    /**
     * Marks the special nodes/meshes in json for efficient parse.
     */
    _markDefs(): void;
    /**
     * Counts references to shared node / Object3D resources. These resources
     * can be reused, or "instantiated", at multiple nodes in the scene
     * hierarchy. Mesh, Camera, and Light instances are instantiated and must
     * be marked. Non-scenegraph resources (like Materials, Geometries, and
     * Textures) can be reused directly and are not marked here.
     *
     * Example: CesiumMilkTruck sample model reuses "Wheel" meshes.
     */
    _addNodeRef(cache: any, index: any): void;
    /** Returns a reference to a shared resource, cloning it if necessary. */
    _getNodeRef(cache: any, index: any, object: any): any;
    _invokeOne(func: any): any;
    _invokeAll(func: any): any[];
    /**
     * Requests the specified dependency asynchronously, with caching.
     */
    getDependency(type: 'scene' | 'node', index: number): Promise<Object3D>;
    getDependency(type: 'accessor', index: number): Promise<BufferAttribute | InterleavedBufferAttribute>;
    getDependency(type: 'mesh', index: number): Promise<Group | Mesh | SkinnedMesh>;
    getDependency(type: 'bufferView' | 'buffer', index: number): Promise<ArrayBuffer>;
    getDependency(type: 'material', index: number): Promise<Material>;
    getDependency(type: 'texture', index: number): Promise<Texture>;
    getDependency(type: 'skin', index: number): Promise<any>;
    getDependency(type: 'animation', index: number): Promise<AnimationClip>;
    getDependency(type: 'camera', index: number): Promise<Camera>;
    /**
     * Requests all dependencies of the specified type asynchronously, with caching.
     */
    getDependencies(type: string): Promise<any[]>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
     */
    loadBuffer(bufferIndex: number): Promise<ArrayBuffer>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
     */
    loadBufferView(bufferViewIndex: number): Promise<ArrayBuffer>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors
     */
    loadAccessor(accessorIndex: number): Promise<BufferAttribute | InterleavedBufferAttribute>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#textures
     */
    loadTexture(textureIndex: number): Promise<Texture>;
    loadTextureImage(textureIndex: number, sourceIndex: number, loader: TextureLoader): any;
    loadImageSource(sourceIndex: any, loader: any): any;
    /**
     * Asynchronously assigns a texture to the given material parameters.
     * @param {Object} materialParams
     * @param {string} mapName
     * @param {Object} mapDef
     * @param {string=} colorSpace
     * @return {Promise<Texture>}
     */
    assignTexture(materialParams: any, mapName: any, mapDef: any, colorSpace?: any): Promise<Texture>;
    /**
     * Assigns final material to a Mesh, Line, or Points instance. The instance
     * already has a material (generated from the glTF material options alone)
     * but reuse of the same glTF material may require multiple threejs materials
     * to accommodate different primitive types, defines, etc. New materials will
     * be created if necessary, and reused from a cache.
     * @param  {Object3D} mesh Mesh, Line, or Points instance.
     */
    assignFinalMaterial(mesh: any): void;
    getMaterialType(): typeof MeshStandardMaterial;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials
     */
    loadMaterial(materialIndex: number): Promise<Material>;
    /** When Object3D instances are targeted by animation, they need unique names. */
    createUniqueName(originalName: any): string;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry
     *
     * Creates BufferGeometries from primitives.
     *
     * @param {Array<GLTF.Primitive>} primitives
     * @return {Promise<Array<BufferGeometry>>}
     */
    loadGeometries(primitives: any): Promise<any[]>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
     */
    loadMesh(meshIndex: number): Promise<Group | Mesh | SkinnedMesh>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#cameras
     */
    loadCamera(cameraIndex: number): Promise<Camera>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
     */
    loadSkin(skinIndex: number): Promise<any>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
     */
    loadAnimation(animationIndex: number): Promise<AnimationClip>;
    createNodeMesh(nodeIndex: any): Promise<any>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#nodes-and-hierarchy
     */
    loadNode(nodeIndex: number): Promise<Object3D>;
    /**
     * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scenes
     */
    loadScene(sceneIndex: number): Promise<Group>;
}
export {};
