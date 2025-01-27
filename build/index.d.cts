import { Buffer } from 'node:buffer';
import { Loader, LoadingManager, BufferGeometry, Texture, AnimationClip, Group, Camera, Mesh, SkinnedMesh, Material, Object3D, BufferAttribute, InterleavedBufferAttribute, MeshStandardMaterial } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { GLTFExporterPlugin, GLTFExporterOptions } from 'three/examples/jsm/exporters/GLTFExporter.js';

declare class DRACOLoader extends Loader {
    decoderPath: string;
    decoderConfig: {
        [key: string]: any;
    };
    decoderPending: any;
    workerLimit: number;
    workerPool: any[];
    workerNextTaskID: number;
    workerSourceURL: string;
    defaultAttributeIDs: {
        position: string;
        normal: string;
        color: string;
        uv: string;
    };
    defaultAttributeTypes: {
        position: string;
        normal: string;
        color: string;
        uv: string;
    };
    constructor(manager?: LoadingManager);
    setDecoderConfig(config: object): this;
    setWorkerLimit(workerLimit: number): this;
    load(url: string, onLoad: (geometry: BufferGeometry) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: Error) => void): void;
    decodeDracoFile(buffer: ArrayBuffer, callback: (geometry: BufferGeometry) => void, attributeIDs?: any, attributeTypes?: any): void;
    decodeGeometry(buffer: ArrayBuffer, taskConfig: any): Promise<BufferGeometry>;
    _createGeometry(geometryData: any): BufferGeometry;
    preload(): this;
    _loadLibrary(url: string, responseType: string): Promise<unknown>;
    _initDecoder(): any;
    _getWorker(taskID: any, taskCost: any): any;
    _releaseTask(worker: any, taskID: any): void;
    dispose(): this;
}

declare class FileLoader extends Loader {
    mimeType: string;
    responseType: string;
    constructor(manager?: LoadingManager);
    load(url: string, onLoad?: (response: string | ArrayBuffer) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: Error) => void): void;
    setResponseType(value: string): FileLoader;
    setMimeType(value: string): FileLoader;
}

declare class TextureLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(url: string, onLoad?: (texture: Texture) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: Error) => void): Texture;
}

interface GLTF {
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
interface GLTFLoaderPlugin {
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
declare class GLTFLoader extends Loader {
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

declare class ImageLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(url: string, onLoad?: (image: ArrayBuffer) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: Error) => void): void;
}

declare class GLTFExporter {
    pluginCallbacks: any[];
    static Utils: {
        insertKeyframe: (track: any, time: any) => any;
        mergeMorphTargetTracks: (clip: any, root: any) => any;
    };
    constructor();
    register(callback: (writer: GLTFWriter) => GLTFExporterPlugin): this;
    unregister(callback: (writer: GLTFWriter) => GLTFExporterPlugin): this;
    /**
     * Parse scenes and generate GLTF output
     * @param  {Scene or [THREE.Scenes]} input   Scene or Array of THREE.Scenes
     * @param  {Function} onDone  Callback on completed
     * @param  {Function} onError  Callback on errors
     * @param  {Object} options options
     */
    parse(input: Object3D | Object3D[], onDone: (gltf: Buffer) => void, onError: (error: ErrorEvent) => void, options: GLTFExporterOptions & {
        binary: true;
    }): void;
    /**
     * Parse scenes and generate GLTF output
     * @param  {Scene or [THREE.Scenes]} input   Scene or Array of THREE.Scenes
     * @param  {Function} onDone  Callback on completed
     * @param  {Function} onError  Callback on errors
     * @param  {Object} options options
     */
    parse(input: Object3D | Object3D[], onDone: (gltf: {
        [key: string]: any;
    }) => void, onError: (error: ErrorEvent) => void, options?: GLTFExporterOptions): void;
    /**
     * Parse scenes and generate GLTF output
     * @param  {Scene or [THREE.Scenes]} input   Scene or Array of THREE.Scenes
     * @param  {Object} options options
     * @return GLB buffer
     */
    parseAsync(input: Object3D | Object3D[], options: GLTFExporterOptions & {
        binary: true;
    }): Promise<Buffer>;
    /**
     * Parse scenes and generate GLTF output
     * @param  {Scene or [THREE.Scenes]} input   Scene or Array of THREE.Scenes
     * @param  {Object} options options
     * @return GLTF JSON object
     */
    parseAsync(input: Object3D | Object3D[], options?: GLTFExporterOptions): Promise<{
        [key: string]: any;
    }>;
}
/**
 * Writer
 */
declare class GLTFWriter {
    plugins: any[];
    options: any;
    pending: any[];
    byteOffset: number;
    buffers: any[];
    nodeMap: Map<any, any>;
    skins: any[];
    extensionsUsed: {};
    extensionsRequired: {};
    uids: Map<any, any>;
    uid: number;
    json: any;
    cache: {
        meshes: Map<any, any>;
        attributes: Map<any, any>;
        attributesNormalized: Map<any, any>;
        materials: Map<any, any>;
        textures: Map<any, any>;
        images: Map<any, any>;
    };
    setPlugins(plugins: GLTFExporterPlugin[]): void;
    /**
     * Parse scenes and generate GLTF output
     * @param  {Scene or [THREE.Scenes]} input   Scene or Array of THREE.Scenes
     * @param  {Function} onDone  Callback on completed
     * @param  {Object} options options
     */
    write(input: Object3D | Object3D[], onDone: (gltf: Buffer | {
        [key: string]: any;
    }) => void, options?: GLTFExporterOptions): Promise<void>;
    /**
     * Serializes a userData.
     *
     * @param {THREE.Object3D|THREE.Material} object
     * @param {Object} objectDef
     */
    serializeUserData(object: any, objectDef: any): void;
    /**
     * Returns ids for buffer attributes.
     * @param  {Object} object
     * @return {Integer}
     */
    getUID(attribute: any, isRelativeCopy?: boolean): any;
    /**
     * Checks if normal attribute values are normalized.
     *
     * @param {BufferAttribute} normal
     * @returns {Boolean}
     */
    isNormalizedNormalAttribute(normal: any): boolean;
    /**
     * Creates normalized normal buffer attribute.
     *
     * @param {BufferAttribute} normal
     * @returns {BufferAttribute}
     *
     */
    createNormalizedNormalAttribute(normal: any): any;
    /**
     * Applies a texture transform, if present, to the map definition. Requires
     * the KHR_texture_transform extension.
     *
     * @param {Object} mapDef
     * @param {THREE.Texture} texture
     */
    applyTextureTransform(mapDef: any, texture: any): void;
    buildMetalRoughTexture(metalnessMap: any, roughnessMap: any): any;
    /**
     * Process a buffer to append to the default one.
     * @param  {ArrayBuffer} buffer
     * @return {Integer}
     */
    processBuffer(buffer: any): number;
    /**
     * Process and generate a BufferView
     * @param  {BufferAttribute} attribute
     * @param  {number} componentType
     * @param  {number} start
     * @param  {number} count
     * @param  {number} target (Optional) Target usage of the BufferView
     * @return {Object}
     */
    processBufferView(attribute: any, componentType: any, start: any, count: any, target: any): any;
    /**
     * Process and generate a BufferView from an image Blob.
     * @param {Buffer} imgBuffer
     * @return {Integer}
     */
    processBufferViewImage(imgBuffer: Buffer): number;
    /**
     * Process attribute to generate an accessor
     * @param  {BufferAttribute} attribute Attribute to process
     * @param  {THREE.BufferGeometry} geometry (Optional) Geometry used for truncated draw range
     * @param  {Integer} start (Optional)
     * @param  {Integer} count (Optional)
     * @return {Integer|null} Index of the processed accessor on the "accessors" array
     */
    processAccessor(attribute: any, geometry?: any, start?: any, count?: any): number;
    /**
     * Process image
     * @param  {Image} image to process
     * @param  {Integer} format of the image (RGBAFormat)
     * @param  {Boolean} flipY before writing out the image
     * @param  {String} mimeType export format
     * @return {Integer}     Index of the processed texture in the "images" array
     */
    processImage(image: any, format: any, flipY: any, mimeType?: string): any;
    /**
     * Process sampler
     * @param  {Texture} map Texture to process
     * @return {Integer}     Index of the processed texture in the "samplers" array
     */
    processSampler(map: any): number;
    /**
     * Process texture
     * @param  {Texture} map Map to process
     * @return {Integer} Index of the processed texture in the "textures" array
     */
    processTexture(map: any): any;
    /**
     * Process material
     * @param  {THREE.Material} material Material to process
     * @return {Integer|null} Index of the processed material in the "materials" array
     */
    processMaterial(material: any): any;
    /**
     * Process mesh
     * @param  {THREE.Mesh} mesh Mesh to process
     * @return {Integer|null} Index of the processed mesh in the "meshes" array
     */
    processMesh(mesh: any): any;
    /**
     * If a vertex attribute with a
     * [non-standard data type](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#meshes-overview)
     * is used, it is checked whether it is a valid data type according to the
     * [KHR_mesh_quantization](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_mesh_quantization/README.md)
     * extension.
     * In this case the extension is automatically added to the list of used extensions.
     *
     * @param {string} attributeName
     * @param {THREE.BufferAttribute} attribute
     */
    detectMeshQuantization(attributeName: any, attribute: any): void;
    /**
     * Process camera
     * @param  {THREE.Camera} camera Camera to process
     * @return {Integer}      Index of the processed mesh in the "camera" array
     */
    processCamera(camera: any): number;
    /**
     * Creates glTF animation entry from AnimationClip object.
     *
     * Status:
     * - Only properties listed in PATH_PROPERTIES may be animated.
     *
     * @param {THREE.AnimationClip} clip
     * @param {THREE.Object3D} root
     * @return {number|null}
     */
    processAnimation(clip: any, root: any): number;
    /**
     * @param {THREE.Object3D} object
     * @return {number|null}
     */
    processSkin(object: any): number;
    /**
     * Process Object3D node
     * @param  {THREE.Object3D} node Object3D to processNode
     * @return {Integer} Index of the node in the nodes list
     */
    processNode(object: any): number;
    /**
     * Process Scene
     * @param  {Scene} node Scene to process
     */
    processScene(scene: any): void;
    /**
     * Creates a Scene to hold a list of objects and parse it
     * @param  {Array} objects List of objects to process
     */
    processObjects(objects: any): void;
    /**
     * @param {THREE.Object3D|Array<THREE.Object3D>} input
     */
    processInput(input: any): void;
    _invokeAll(func: any): void;
}

/**
 * Load (draco-compressed) gltf file from local file or web resource and decode/parse content.
 * @param url - Path to gltf file or web resource
 */
declare function loadGltf(url: string): Promise<GLTF>;

export { DRACOLoader, FileLoader, type GLTF, GLTFExporter, GLTFLoader, type GLTFLoaderPlugin, ImageLoader, TextureLoader, loadGltf };
