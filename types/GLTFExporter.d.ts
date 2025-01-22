import { Object3D } from 'three';
import { GLTFExporterOptions, GLTFExporterPlugin } from 'three/examples/jsm/exporters/GLTFExporter';
import { Buffer } from 'node:buffer';
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
export { GLTFExporter };
