import { JSDOM } from 'jsdom';
import { TextDecoder as TextDecoder$1 } from 'node:util';
import { Blob as Blob$1, resolveObjectURL, Buffer } from 'node:buffer';
import { URL, fileURLToPath } from 'node:url';
import { dirname, sep } from 'node:path';
import { Loader, Cache, Texture, Quaternion, LoaderUtils, Color, LinearSRGBColorSpace, SpotLight, PointLight, DirectionalLight, MeshBasicMaterial, SRGBColorSpace, MeshPhysicalMaterial, Vector2, BufferAttribute, InterleavedBuffer, InterleavedBufferAttribute, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, PointsMaterial, Material, LineBasicMaterial, MeshStandardMaterial, DoubleSide, PropertyBinding, BufferGeometry, SkinnedMesh, Mesh, LineSegments, Line, LineLoop, Points, Group, PerspectiveCamera, MathUtils, OrthographicCamera, InterpolateLinear, AnimationClip, Bone, Object3D, Matrix4, Skeleton, ColorManagement, TriangleFanDrawMode, NearestFilter, NearestMipmapNearestFilter, LinearMipmapNearestFilter, NearestMipmapLinearFilter, ClampToEdgeWrapping, MirroredRepeatWrapping, InterpolateDiscrete, FrontSide, TriangleStripDrawMode, VectorKeyframeTrack, QuaternionKeyframeTrack, NumberKeyframeTrack, Box3, Vector3, Sphere, Interpolant, PlaneGeometry, ShaderMaterial, Uniform, Scene, WebGLRenderer, REVISION, CompressedTexture, Source, NoColorSpace, RGBAFormat } from 'three';
import { readFile } from 'node:fs/promises';
import fetch, { Request, Headers } from 'node-fetch';
import { toByteArray } from 'base64-js';
import sharp from 'sharp';
import { Worker } from 'node:worker_threads';

const dom = new JSDOM().window;
if (!global.DOMParser) {
    global.DOMParser = dom.DOMParser;
}
if (!global.Blob) {
    global.Blob = Blob$1;
}
if (!global.URL) {
    global.URL = URL;
}
if (!global.TextDecoder) {
    global.TextDecoder = TextDecoder$1;
}

const loading = {};
class FileLoader extends Loader {
    constructor(manager) {
        super(manager);
    }
    load(url, onLoad, onProgress, onError) {
        if (url === undefined)
            url = '';
        if (this.path !== undefined)
            url = this.path + url;
        url = this.manager.resolveURL(url);
        if (loading[url] !== undefined) {
            loading[url].push({
                onLoad,
                onProgress,
                onError
            });
            return;
        }
        loading[url] = [];
        loading[url].push({
            onLoad,
            onProgress,
            onError,
        });
        const mimeType = this.mimeType;
        const responseType = this.responseType;
        let promise;
        if (!/^https?:\/\//.test(url) && !/^data:/.test(url)) {
            promise = readFile(url)
                .then(buffer => {
                switch (responseType) {
                    case 'arraybuffer':
                        const ab = new ArrayBuffer(buffer.length);
                        const view = new Uint8Array(ab);
                        for (let i = 0; i < buffer.length; i++) {
                            view[i] = buffer[i];
                        }
                        return ab;
                    case 'document':
                        const text = buffer.toString();
                        const parser = new DOMParser();
                        return parser.parseFromString(text, mimeType);
                    case 'json':
                        return JSON.parse(buffer.toString());
                    default:
                        return buffer.toString();
                }
            });
        }
        else if (/^data:application\/octet-stream;base64,/.test(url)) {
            const base64 = url.split(';base64,').pop();
            const buffer = toByteArray(base64);
            promise = Promise.resolve(buffer.buffer);
        }
        else {
            const req = new Request(url, {
                headers: new Headers(this.requestHeader),
                credentials: this.withCredentials ? 'include' : 'same-origin',
            });
            promise = fetch(req)
                .then(response => {
                if (response.status === 200 || response.status === 0) {
                    if (response.status === 0) {
                        console.warn('THREE.FileLoader: HTTP Status 0 received.');
                    }
                    return response;
                }
                else {
                    throw Error(`fetch for "${response.url}" responded with ${response.status}: ${response.statusText}`);
                }
            })
                .then(response => {
                switch (responseType) {
                    case 'arraybuffer':
                        return response.arrayBuffer();
                    case 'blob':
                        return response.blob();
                    case 'document':
                        return response.text()
                            .then(text => {
                            const parser = new DOMParser();
                            return parser.parseFromString(text, mimeType);
                        });
                    case 'json':
                        return response.json();
                    default:
                        if (mimeType === undefined) {
                            return response.text();
                        }
                        else {
                            const re = /charset="?([^;"\s]*)"?/i;
                            const exec = re.exec(mimeType);
                            const label = exec && exec[1] ? exec[1].toLowerCase() : undefined;
                            const decoder = new TextDecoder(label);
                            return response.arrayBuffer().then(ab => decoder.decode(ab));
                        }
                }
            });
        }
        promise
            .then(data => {
            const callbacks = loading[url];
            delete loading[url];
            for (let i = 0, il = callbacks.length; i < il; i++) {
                const callback = callbacks[i];
                if (callback.onLoad)
                    callback.onLoad(data);
            }
        })
            .catch(err => {
            const callbacks = loading[url];
            if (callbacks === undefined) {
                this.manager.itemError(url);
                throw err;
            }
            delete loading[url];
            for (let i = 0, il = callbacks.length; i < il; i++) {
                const callback = callbacks[i];
                if (callback.onError)
                    callback.onError(err);
            }
            this.manager.itemError(url);
        })
            .finally(() => {
            this.manager.itemEnd(url);
        });
        this.manager.itemStart(url);
    }
    setResponseType(value) {
        this.responseType = value;
        return this;
    }
    setMimeType(value) {
        this.mimeType = value;
        return this;
    }
}

class ImageLoader extends Loader {
    constructor(manager) {
        super(manager);
    }
    load(url, onLoad, onProgress, onError) {
        if (this.path !== undefined)
            url = this.path + url;
        url = this.manager.resolveURL(url);
        const scope = this;
        const cached = Cache.get(url);
        if (cached !== undefined) {
            scope.manager.itemStart(url);
            setTimeout(function () {
                if (onLoad)
                    onLoad(cached);
                scope.manager.itemEnd(url);
            }, 0);
        }
        scope.manager.itemStart(url);
        Promise.resolve()
            .then(async () => {
            if (/^blob:.*$/i.test(url)) {
                const blob = resolveObjectURL(url);
                const imageBuffer = Buffer.from(await blob.arrayBuffer());
                return sharp(imageBuffer);
            }
            else if (/^data:/.test(url)) {
                const base64 = url.split(';base64,').pop();
                const imageBuffer = toByteArray(base64);
                return sharp(imageBuffer);
            }
            else if (/^https?:\/\//.test(url)) {
                const req = new Request(url, {
                    headers: new Headers(this.requestHeader),
                    credentials: this.withCredentials ? 'include' : 'same-origin',
                });
                const response = await fetch(req);
                const buffer = Buffer.from(await response.arrayBuffer());
                return sharp(buffer);
            }
            else {
                return sharp(url);
            }
        })
            .then(image => image
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true }))
            .then(({ data, info }) => ({
            data,
            width: info.width,
            height: info.height,
            channels: info.channels,
        }))
            .then(data => {
            Cache.add(url, data);
            if (onLoad)
                onLoad(data);
            scope.manager.itemEnd(url);
        })
            .catch(err => {
            if (onError)
                onError(err);
            scope.manager.itemError(url);
            scope.manager.itemEnd(url);
        });
    }
}

class TextureLoader extends Loader {
    constructor(manager) {
        super(manager);
    }
    load(url, onLoad, onProgress, onError) {
        const texture = new Texture();
        const loader = new ImageLoader(this.manager);
        loader.setCrossOrigin(this.crossOrigin);
        loader.setPath(this.path);
        loader.load(url, function (image) {
            texture.image = image;
            texture.needsUpdate = true;
            if (onLoad !== undefined) {
                onLoad(texture);
            }
        }, onProgress, onError);
        return texture;
    }
}

class GLTFLoader extends Loader {
    constructor(manager) {
        super(manager);
        this.dracoLoader = null;
        this.ktx2Loader = null;
        this.meshoptDecoder = null;
        this.pluginCallbacks = [];
        this.register((parser) => {
            return new GLTFMaterialsClearcoatExtension$1(parser);
        });
        this.register((parser) => {
            return new GLTFTextureBasisUExtension(parser);
        });
        this.register((parser) => {
            return new GLTFTextureWebPExtension(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsSheenExtension$1(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsTransmissionExtension$1(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsVolumeExtension$1(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsIorExtension$1(parser);
        });
        this.register(function (parser) {
            return new GLTFMaterialsEmissiveStrengthExtension$1(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsSpecularExtension$1(parser);
        });
        this.register(function (parser) {
            return new GLTFMaterialsAnisotropyExtension$1(parser);
        });
        this.register((parser) => {
            return new GLTFLightsExtension(parser);
        });
        this.register((parser) => {
            return new GLTFMeshoptCompression(parser);
        });
    }
    load(url, onLoad, onProgress, onError) {
        const scope = this;
        let resourcePath;
        if (this.resourcePath !== '') {
            resourcePath = this.resourcePath;
        }
        else if (this.path !== '') {
            resourcePath = this.path;
        }
        else {
            if (!/^https?:\/\//.test(url) && !/^data:/.test(url)) {
                resourcePath = dirname(url) + sep;
            }
            else {
                resourcePath = LoaderUtils.extractUrlBase(url);
            }
        }
        this.manager.itemStart(url);
        const _onError = (e) => {
            if (onError) {
                onError(e);
            }
            else {
                console.error(e);
            }
            scope.manager.itemError(url);
            scope.manager.itemEnd(url);
        };
        const loader = new FileLoader(this.manager);
        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');
        loader.setRequestHeader(this.requestHeader);
        loader.setWithCredentials(this.withCredentials);
        loader.load(url, (data) => {
            try {
                scope.parse(data, resourcePath, (gltf) => {
                    onLoad(gltf);
                    scope.manager.itemEnd(url);
                }, _onError);
            }
            catch (e) {
                _onError(e);
            }
        }, onProgress, _onError);
    }
    setDRACOLoader(dracoLoader) {
        this.dracoLoader = dracoLoader;
        return this;
    }
    setDDSLoader() {
        throw new Error('THREE.GLTFLoader: "MSFT_texture_dds" no longer supported. Please update to "KHR_texture_basisu".');
    }
    setKTX2Loader(ktx2Loader) {
        this.ktx2Loader = ktx2Loader;
        return this;
    }
    setMeshoptDecoder(meshoptDecoder) {
        this.meshoptDecoder = meshoptDecoder;
        return this;
    }
    register(callback) {
        if (this.pluginCallbacks.indexOf(callback) === -1) {
            this.pluginCallbacks.push(callback);
        }
        return this;
    }
    unregister(callback) {
        if (this.pluginCallbacks.indexOf(callback) !== -1) {
            this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(callback), 1);
        }
        return this;
    }
    parse(data, path, onLoad, onError) {
        let content;
        const extensions = {};
        const plugins = {};
        const textDecoder = new TextDecoder();
        if (typeof data === 'string') {
            content = data;
        }
        else {
            if (data instanceof Buffer) {
                data = data.buffer;
            }
            const magic = textDecoder.decode(new Uint8Array(data.slice(0, 4)));
            if (magic === BINARY_EXTENSION_HEADER_MAGIC) {
                try {
                    extensions[EXTENSIONS.KHR_BINARY_GLTF] = new GLTFBinaryExtension(data);
                }
                catch (error) {
                    if (onError)
                        onError(error);
                    return;
                }
                content = extensions[EXTENSIONS.KHR_BINARY_GLTF].content;
            }
            else {
                content = textDecoder.decode(new Uint8Array(data));
            }
        }
        const json = JSON.parse(content);
        if (json.asset === undefined || json.asset.version[0] < 2) {
            if (onError) {
                onError(new Error('THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.'));
            }
            return;
        }
        const parser = new GLTFParser(json, {
            path: path || this.resourcePath || '',
            crossOrigin: this.crossOrigin,
            requestHeader: this.requestHeader,
            manager: this.manager,
            ktx2Loader: this.ktx2Loader,
            meshoptDecoder: this.meshoptDecoder
        });
        parser.fileLoader.setRequestHeader(this.requestHeader);
        for (let i = 0; i < this.pluginCallbacks.length; i++) {
            const plugin = this.pluginCallbacks[i](parser);
            plugins[plugin.name] = plugin;
            extensions[plugin.name] = true;
        }
        if (json.extensionsUsed) {
            for (let i = 0; i < json.extensionsUsed.length; ++i) {
                const extensionName = json.extensionsUsed[i];
                const extensionsRequired = json.extensionsRequired || [];
                switch (extensionName) {
                    case EXTENSIONS.KHR_MATERIALS_UNLIT:
                        extensions[extensionName] = new GLTFMaterialsUnlitExtension$1();
                        break;
                    case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
                        extensions[extensionName] = new GLTFDracoMeshCompressionExtension(json, this.dracoLoader);
                        break;
                    case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
                        extensions[extensionName] = new GLTFTextureTransformExtension();
                        break;
                    case EXTENSIONS.KHR_MESH_QUANTIZATION:
                        extensions[extensionName] = new GLTFMeshQuantizationExtension();
                        break;
                    default:
                        if (extensionsRequired.indexOf(extensionName) >= 0 && plugins[extensionName] === undefined) {
                            console.warn('THREE.GLTFLoader: Unknown extension "' + extensionName + '".');
                        }
                }
            }
        }
        parser.setExtensions(extensions);
        parser.setPlugins(plugins);
        parser.parse(onLoad, onError);
    }
    parseAsync(data, path) {
        const scope = this;
        return new Promise(function (resolve, reject) {
            scope.parse(data, path, resolve, reject);
        });
    }
}
GLTFLoader.LOG_TEXTURE_LOAD_ERROR = true;
function GLTFRegistry() {
    let objects = {};
    return {
        get: (key) => {
            return objects[key];
        },
        add: (key, object) => {
            objects[key] = object;
        },
        remove: (key) => {
            delete objects[key];
        },
        removeAll: () => {
            objects = {};
        }
    };
}
const EXTENSIONS = {
    KHR_BINARY_GLTF: 'KHR_binary_glTF',
    KHR_DRACO_MESH_COMPRESSION: 'KHR_draco_mesh_compression',
    KHR_LIGHTS_PUNCTUAL: 'KHR_lights_punctual',
    KHR_MATERIALS_CLEARCOAT: 'KHR_materials_clearcoat',
    KHR_MATERIALS_IOR: 'KHR_materials_ior',
    KHR_MATERIALS_SHEEN: 'KHR_materials_sheen',
    KHR_MATERIALS_SPECULAR: 'KHR_materials_specular',
    KHR_MATERIALS_TRANSMISSION: 'KHR_materials_transmission',
    KHR_MATERIALS_ANISOTROPY: 'KHR_materials_anisotropy',
    KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
    KHR_MATERIALS_VOLUME: 'KHR_materials_volume',
    KHR_TEXTURE_BASISU: 'KHR_texture_basisu',
    KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
    KHR_MESH_QUANTIZATION: 'KHR_mesh_quantization',
    KHR_MATERIALS_EMISSIVE_STRENGTH: 'KHR_materials_emissive_strength',
    EXT_TEXTURE_WEBP: 'EXT_texture_webp',
    EXT_MESHOPT_COMPRESSION: 'EXT_meshopt_compression'
};
class GLTFLightsExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_LIGHTS_PUNCTUAL;
        this.cache = { refs: {}, uses: {} };
        this.parser = parser;
    }
    _markDefs() {
        const parser = this.parser;
        const nodeDefs = this.parser.json.nodes || [];
        for (let nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex++) {
            const nodeDef = nodeDefs[nodeIndex];
            if (nodeDef.extensions
                && nodeDef.extensions[this.name]
                && nodeDef.extensions[this.name].light !== undefined) {
                parser._addNodeRef(this.cache, nodeDef.extensions[this.name].light);
            }
        }
    }
    _loadLight(lightIndex) {
        const parser = this.parser;
        const cacheKey = 'light:' + lightIndex;
        let dependency = parser.cache.get(cacheKey);
        if (dependency)
            return dependency;
        const json = parser.json;
        const extensions = (json.extensions && json.extensions[this.name]) || {};
        const lightDefs = extensions.lights || [];
        const lightDef = lightDefs[lightIndex];
        let lightNode;
        const color = new Color(0xffffff);
        if (lightDef.color !== undefined)
            color.setRGB(lightDef.color[0], lightDef.color[1], lightDef.color[2], LinearSRGBColorSpace);
        const range = lightDef.range !== undefined ? lightDef.range : 0;
        switch (lightDef.type) {
            case 'directional':
                lightNode = new DirectionalLight(color);
                lightNode.target.position.set(0, 0, -1);
                lightNode.add(lightNode.target);
                break;
            case 'point':
                lightNode = new PointLight(color);
                lightNode.distance = range;
                break;
            case 'spot':
                lightNode = new SpotLight(color);
                lightNode.distance = range;
                lightDef.spot = lightDef.spot || {};
                lightDef.spot.innerConeAngle = lightDef.spot.innerConeAngle !== undefined ? lightDef.spot.innerConeAngle : 0;
                lightDef.spot.outerConeAngle = lightDef.spot.outerConeAngle !== undefined ? lightDef.spot.outerConeAngle : Math.PI / 4.0;
                lightNode.angle = lightDef.spot.outerConeAngle;
                lightNode.penumbra = 1.0 - lightDef.spot.innerConeAngle / lightDef.spot.outerConeAngle;
                lightNode.target.position.set(0, 0, -1);
                lightNode.add(lightNode.target);
                break;
            default:
                throw new Error('THREE.GLTFLoader: Unexpected light type: ' + lightDef.type);
        }
        lightNode.position.set(0, 0, 0);
        lightNode.decay = 2;
        if (lightDef.intensity !== undefined)
            lightNode.intensity = lightDef.intensity;
        lightNode.name = parser.createUniqueName(lightDef.name || ('light_' + lightIndex));
        dependency = Promise.resolve(lightNode);
        parser.cache.add(cacheKey, dependency);
        return dependency;
    }
    createNodeAttachment(nodeIndex) {
        const self = this;
        const parser = this.parser;
        const json = parser.json;
        const nodeDef = json.nodes[nodeIndex];
        const lightDef = (nodeDef.extensions && nodeDef.extensions[this.name]) || {};
        const lightIndex = lightDef.light;
        if (lightIndex === undefined)
            return null;
        return this._loadLight(lightIndex).then(function (light) {
            return parser._getNodeRef(self.cache, lightIndex, light);
        });
    }
}
let GLTFMaterialsUnlitExtension$1 = class GLTFMaterialsUnlitExtension {
    constructor() {
        this.name = EXTENSIONS.KHR_MATERIALS_UNLIT;
    }
    getMaterialType() {
        return MeshBasicMaterial;
    }
    extendParams(materialParams, materialDef, parser) {
        const pending = [];
        materialParams.color = new Color(1.0, 1.0, 1.0);
        materialParams.opacity = 1.0;
        const metallicRoughness = materialDef.pbrMetallicRoughness;
        if (metallicRoughness) {
            if (Array.isArray(metallicRoughness.baseColorFactor)) {
                const array = metallicRoughness.baseColorFactor;
                materialParams.color.setRGB(array[0], array[1], array[2], LinearSRGBColorSpace);
                materialParams.opacity = array[3];
            }
            if (metallicRoughness.baseColorTexture !== undefined) {
                pending.push(parser.assignTexture(materialParams, 'map', metallicRoughness.baseColorTexture, SRGBColorSpace));
            }
        }
        return Promise.all(pending);
    }
};
let GLTFMaterialsEmissiveStrengthExtension$1 = class GLTFMaterialsEmissiveStrengthExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_MATERIALS_EMISSIVE_STRENGTH;
        this.parser = parser;
    }
    extendMaterialParams(materialIndex, materialParams) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name]) {
            return Promise.resolve();
        }
        const emissiveStrength = materialDef.extensions[this.name].emissiveStrength;
        if (emissiveStrength !== undefined) {
            materialParams.emissiveIntensity = emissiveStrength;
        }
        return Promise.resolve();
    }
};
let GLTFMaterialsClearcoatExtension$1 = class GLTFMaterialsClearcoatExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_MATERIALS_CLEARCOAT;
        this.parser = parser;
    }
    getMaterialType(materialIndex) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name])
            return null;
        return MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name]) {
            return Promise.resolve();
        }
        const pending = [];
        const extension = materialDef.extensions[this.name];
        if (extension.clearcoatFactor !== undefined) {
            materialParams.clearcoat = extension.clearcoatFactor;
        }
        if (extension.clearcoatTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'clearcoatMap', extension.clearcoatTexture));
        }
        if (extension.clearcoatRoughnessFactor !== undefined) {
            materialParams.clearcoatRoughness = extension.clearcoatRoughnessFactor;
        }
        if (extension.clearcoatRoughnessTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'clearcoatRoughnessMap', extension.clearcoatRoughnessTexture));
        }
        if (extension.clearcoatNormalTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'clearcoatNormalMap', extension.clearcoatNormalTexture));
            if (extension.clearcoatNormalTexture.scale !== undefined) {
                const scale = extension.clearcoatNormalTexture.scale;
                materialParams.clearcoatNormalScale = new Vector2(scale, scale);
            }
        }
        return Promise.all(pending);
    }
};
let GLTFMaterialsSheenExtension$1 = class GLTFMaterialsSheenExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_MATERIALS_SHEEN;
        this.parser = parser;
    }
    getMaterialType(materialIndex) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name])
            return null;
        return MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name]) {
            return Promise.resolve();
        }
        const pending = [];
        materialParams.sheenColor = new Color(0, 0, 0);
        materialParams.sheenRoughness = 0;
        materialParams.sheen = 1;
        const extension = materialDef.extensions[this.name];
        if (extension.sheenColorFactor !== undefined) {
            const colorFactor = extension.sheenColorFactor;
            materialParams.sheenColor.setRGB(colorFactor[0], colorFactor[1], colorFactor[2], LinearSRGBColorSpace);
        }
        if (extension.sheenRoughnessFactor !== undefined) {
            materialParams.sheenRoughness = extension.sheenRoughnessFactor;
        }
        if (extension.sheenColorTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'sheenColorMap', extension.sheenColorTexture, SRGBColorSpace));
        }
        if (extension.sheenRoughnessTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'sheenRoughnessMap', extension.sheenRoughnessTexture));
        }
        return Promise.all(pending);
    }
};
let GLTFMaterialsTransmissionExtension$1 = class GLTFMaterialsTransmissionExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_MATERIALS_TRANSMISSION;
        this.parser = parser;
    }
    getMaterialType(materialIndex) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name])
            return null;
        return MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name]) {
            return Promise.resolve();
        }
        const pending = [];
        const extension = materialDef.extensions[this.name];
        if (extension.transmissionFactor !== undefined) {
            materialParams.transmission = extension.transmissionFactor;
        }
        if (extension.transmissionTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'transmissionMap', extension.transmissionTexture));
        }
        return Promise.all(pending);
    }
};
let GLTFMaterialsVolumeExtension$1 = class GLTFMaterialsVolumeExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_MATERIALS_VOLUME;
        this.parser = parser;
    }
    getMaterialType(materialIndex) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name])
            return null;
        return MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name]) {
            return Promise.resolve();
        }
        const pending = [];
        const extension = materialDef.extensions[this.name];
        materialParams.thickness = extension.thicknessFactor !== undefined ? extension.thicknessFactor : 0;
        if (extension.thicknessTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'thicknessMap', extension.thicknessTexture));
        }
        materialParams.attenuationDistance = extension.attenuationDistance || 0;
        const colorArray = extension.attenuationColor || [1, 1, 1];
        materialParams.attenuationColor = new Color().setRGB(colorArray[0], colorArray[1], colorArray[2], LinearSRGBColorSpace);
        return Promise.all(pending);
    }
};
let GLTFMaterialsIorExtension$1 = class GLTFMaterialsIorExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_MATERIALS_IOR;
        this.parser = parser;
    }
    getMaterialType(materialIndex) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name])
            return null;
        return MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name]) {
            return Promise.resolve();
        }
        const extension = materialDef.extensions[this.name];
        materialParams.ior = extension.ior !== undefined ? extension.ior : 1.5;
        return Promise.resolve();
    }
};
let GLTFMaterialsSpecularExtension$1 = class GLTFMaterialsSpecularExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_MATERIALS_SPECULAR;
        this.parser = parser;
    }
    getMaterialType(materialIndex) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name])
            return null;
        return MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name]) {
            return Promise.resolve();
        }
        const pending = [];
        const extension = materialDef.extensions[this.name];
        materialParams.specularIntensity = extension.specularFactor !== undefined ? extension.specularFactor : 1.0;
        if (extension.specularTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'specularIntensityMap', extension.specularTexture));
        }
        const colorArray = extension.specularColorFactor || [1, 1, 1];
        materialParams.specularColor = new Color().setRGB(colorArray[0], colorArray[1], colorArray[2], LinearSRGBColorSpace);
        if (extension.specularColorTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'specularColorMap', extension.specularColorTexture, SRGBColorSpace));
        }
        return Promise.all(pending);
    }
};
let GLTFMaterialsAnisotropyExtension$1 = class GLTFMaterialsAnisotropyExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_MATERIALS_ANISOTROPY;
        this.parser = parser;
    }
    getMaterialType(materialIndex) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name])
            return null;
        return MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name]) {
            return Promise.resolve();
        }
        const pending = [];
        const extension = materialDef.extensions[this.name];
        if (extension.anisotropyStrength !== undefined) {
            materialParams.anisotropy = extension.anisotropyStrength;
        }
        if (extension.anisotropyRotation !== undefined) {
            materialParams.anisotropyRotation = extension.anisotropyRotation;
        }
        if (extension.anisotropyTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'anisotropyMap', extension.anisotropyTexture));
        }
        return Promise.all(pending);
    }
};
class GLTFTextureBasisUExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_TEXTURE_BASISU;
        this.parser = parser;
    }
    loadTexture(textureIndex) {
        const parser = this.parser;
        const json = parser.json;
        const textureDef = json.textures[textureIndex];
        if (!textureDef.extensions || !textureDef.extensions[this.name]) {
            return null;
        }
        const extension = textureDef.extensions[this.name];
        const loader = parser.options.ktx2Loader;
        if (!loader) {
            if (json.extensionsRequired && json.extensionsRequired.indexOf(this.name) >= 0) {
                throw new Error('THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures');
            }
            else {
                return null;
            }
        }
        return parser.loadTextureImage(textureIndex, extension.source, loader);
    }
}
class GLTFTextureWebPExtension {
    constructor(parser) {
        this.name = EXTENSIONS.EXT_TEXTURE_WEBP;
        this.isSupported = null;
        this.parser = parser;
    }
    loadTexture(textureIndex) {
        const name = this.name;
        const parser = this.parser;
        const json = parser.json;
        const textureDef = json.textures[textureIndex];
        if (!textureDef.extensions || !textureDef.extensions[name]) {
            return null;
        }
        const extension = textureDef.extensions[name];
        const source = json.images[extension.source];
        let loader = parser.textureLoader;
        if (source.uri) {
            const handler = parser.options.manager.getHandler(source.uri);
            if (handler !== null)
                loader = handler;
        }
        return this.detectSupport().then(function (isSupported) {
            if (isSupported)
                return parser.loadTextureImage(textureIndex, extension.source, loader);
            if (json.extensionsRequired && json.extensionsRequired.indexOf(name) >= 0) {
                throw new Error('THREE.GLTFLoader: WebP required by asset but unsupported.');
            }
            return parser.loadTexture(textureIndex);
        });
    }
    detectSupport() {
        if (!this.isSupported) {
            this.isSupported = Promise.resolve(true);
        }
        return this.isSupported;
    }
}
class GLTFMeshoptCompression {
    constructor(parser) {
        this.name = EXTENSIONS.EXT_MESHOPT_COMPRESSION;
        this.parser = parser;
    }
    loadBufferView(index) {
        const json = this.parser.json;
        const bufferView = json.bufferViews[index];
        if (bufferView.extensions && bufferView.extensions[this.name]) {
            const extensionDef = bufferView.extensions[this.name];
            const buffer = this.parser.getDependency('buffer', extensionDef.buffer);
            const decoder = this.parser.options.meshoptDecoder;
            if (!decoder || !decoder.supported) {
                if (json.extensionsRequired && json.extensionsRequired.indexOf(this.name) >= 0) {
                    throw new Error('THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files');
                }
                else {
                    return null;
                }
            }
            return Promise.all([buffer, decoder.ready]).then(function (res) {
                const byteOffset = extensionDef.byteOffset || 0;
                const byteLength = extensionDef.byteLength || 0;
                const count = extensionDef.count;
                const stride = extensionDef.byteStride;
                const result = new ArrayBuffer(count * stride);
                const source = new Uint8Array(res[0], byteOffset, byteLength);
                decoder.decodeGltfBuffer(new Uint8Array(result), count, stride, source, extensionDef.mode, extensionDef.filter);
                return result;
            });
        }
        else {
            return null;
        }
    }
}
const BINARY_EXTENSION_HEADER_MAGIC = 'glTF';
const BINARY_EXTENSION_HEADER_LENGTH = 12;
const BINARY_EXTENSION_CHUNK_TYPES = { JSON: 0x4E4F534A, BIN: 0x004E4942 };
class GLTFBinaryExtension {
    constructor(data) {
        this.name = EXTENSIONS.KHR_BINARY_GLTF;
        this.content = null;
        this.body = null;
        const headerView = new DataView(data, 0, BINARY_EXTENSION_HEADER_LENGTH);
        const textDecoder = new TextDecoder();
        this.header = {
            magic: textDecoder.decode(new Uint8Array(data.slice(0, 4))),
            version: headerView.getUint32(4, true),
            length: headerView.getUint32(8, true)
        };
        if (this.header.magic !== BINARY_EXTENSION_HEADER_MAGIC) {
            throw new Error('THREE.GLTFLoader: Unsupported glTF-Binary header.');
        }
        else if (this.header.version < 2.0) {
            throw new Error('THREE.GLTFLoader: Legacy binary file detected.');
        }
        const chunkContentsLength = this.header.length - BINARY_EXTENSION_HEADER_LENGTH;
        const chunkView = new DataView(data, BINARY_EXTENSION_HEADER_LENGTH);
        let chunkIndex = 0;
        while (chunkIndex < chunkContentsLength) {
            const chunkLength = chunkView.getUint32(chunkIndex, true);
            chunkIndex += 4;
            const chunkType = chunkView.getUint32(chunkIndex, true);
            chunkIndex += 4;
            if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON) {
                const contentArray = new Uint8Array(data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength);
                this.content = textDecoder.decode(contentArray);
            }
            else if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN) {
                const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
                this.body = data.slice(byteOffset, byteOffset + chunkLength);
            }
            chunkIndex += chunkLength;
        }
        if (this.content === null) {
            throw new Error('THREE.GLTFLoader: JSON content not found.');
        }
    }
}
class GLTFDracoMeshCompressionExtension {
    constructor(json, dracoLoader) {
        this.name = EXTENSIONS.KHR_DRACO_MESH_COMPRESSION;
        if (!dracoLoader) {
            throw new Error('THREE.GLTFLoader: No DRACOLoader instance provided.');
        }
        this.json = json;
        this.dracoLoader = dracoLoader;
        this.dracoLoader.preload();
    }
    decodePrimitive(primitive, parser) {
        const json = this.json;
        const dracoLoader = this.dracoLoader;
        const bufferViewIndex = primitive.extensions[this.name].bufferView;
        const gltfAttributeMap = primitive.extensions[this.name].attributes;
        const threeAttributeMap = {};
        const attributeNormalizedMap = {};
        const attributeTypeMap = {};
        for (const attributeName in gltfAttributeMap) {
            const threeAttributeName = ATTRIBUTES[attributeName] || attributeName.toLowerCase();
            threeAttributeMap[threeAttributeName] = gltfAttributeMap[attributeName];
        }
        for (const attributeName in primitive.attributes) {
            const threeAttributeName = ATTRIBUTES[attributeName] || attributeName.toLowerCase();
            if (gltfAttributeMap[attributeName] !== undefined) {
                const accessorDef = json.accessors[primitive.attributes[attributeName]];
                const componentType = WEBGL_COMPONENT_TYPES[accessorDef.componentType];
                attributeTypeMap[threeAttributeName] = componentType.name;
                attributeNormalizedMap[threeAttributeName] = accessorDef.normalized === true;
            }
        }
        return parser.getDependency('bufferView', bufferViewIndex).then(function (bufferView) {
            return new Promise(function (resolve) {
                dracoLoader.decodeDracoFile(bufferView, function (geometry) {
                    for (const attributeName in geometry.attributes) {
                        const attribute = geometry.attributes[attributeName];
                        const normalized = attributeNormalizedMap[attributeName];
                        if (normalized !== undefined)
                            attribute.normalized = normalized;
                    }
                    resolve(geometry);
                }, threeAttributeMap, attributeTypeMap);
            });
        });
    }
}
class GLTFTextureTransformExtension {
    constructor() {
        this.name = EXTENSIONS.KHR_TEXTURE_TRANSFORM;
    }
    extendTexture(texture, transform) {
        if (transform.texCoord !== undefined) {
            console.warn('THREE.GLTFLoader: Custom UV sets in "' + this.name + '" extension not yet supported.');
        }
        if (transform.offset === undefined && transform.rotation === undefined && transform.scale === undefined) {
            return texture;
        }
        texture = texture.clone();
        if (transform.offset !== undefined) {
            texture.offset.fromArray(transform.offset);
        }
        if (transform.rotation !== undefined) {
            texture.rotation = transform.rotation;
        }
        if (transform.scale !== undefined) {
            texture.repeat.fromArray(transform.scale);
        }
        texture.needsUpdate = true;
        return texture;
    }
}
class GLTFMeshQuantizationExtension {
    constructor() {
        this.name = EXTENSIONS.KHR_MESH_QUANTIZATION;
    }
}
class GLTFCubicSplineInterpolant extends Interpolant {
    constructor(parameterPositions, sampleValues, sampleSize, resultBuffer) {
        super(parameterPositions, sampleValues, sampleSize, resultBuffer);
        this.beforeStart_ = this.copySampleValue_;
        this.afterEnd_ = this.copySampleValue_;
    }
    copySampleValue_(index) {
        const result = this.resultBuffer, values = this.sampleValues, valueSize = this.valueSize, offset = index * valueSize * 3 + valueSize;
        for (let i = 0; i !== valueSize; i++) {
            result[i] = values[offset + i];
        }
        return result;
    }
    interpolate_(i1, t0, t, t1) {
        const result = this.resultBuffer;
        const values = this.sampleValues;
        const stride = this.valueSize;
        const stride2 = stride * 2;
        const stride3 = stride * 3;
        const td = t1 - t0;
        const p = (t - t0) / td;
        const pp = p * p;
        const ppp = pp * p;
        const offset1 = i1 * stride3;
        const offset0 = offset1 - stride3;
        const s2 = -2 * ppp + 3 * pp;
        const s3 = ppp - pp;
        const s0 = 1 - s2;
        const s1 = s3 - pp + p;
        for (let i = 0; i !== stride; i++) {
            const p0 = values[offset0 + i + stride];
            const m0 = values[offset0 + i + stride2] * td;
            const p1 = values[offset1 + i + stride];
            const m1 = values[offset1 + i] * td;
            result[i] = s0 * p0 + s1 * m0 + s2 * p1 + s3 * m1;
        }
        return result;
    }
    ;
}
const _q = new Quaternion();
class GLTFCubicSplineQuaternionInterpolant extends GLTFCubicSplineInterpolant {
    interpolate_(i1, t0, t, t1) {
        const result = super.interpolate_(i1, t0, t, t1);
        _q.fromArray(result).normalize().toArray(result);
        return result;
    }
}
const WEBGL_CONSTANTS$1 = {
    FLOAT: 5126,
    FLOAT_MAT3: 35675,
    FLOAT_MAT4: 35676,
    FLOAT_VEC2: 35664,
    FLOAT_VEC3: 35665,
    FLOAT_VEC4: 35666,
    LINEAR: 9729,
    REPEAT: 10497,
    SAMPLER_2D: 35678,
    POINTS: 0,
    LINES: 1,
    LINE_LOOP: 2,
    LINE_STRIP: 3,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    TRIANGLE_FAN: 6,
    UNSIGNED_BYTE: 5121,
    UNSIGNED_SHORT: 5123
};
const WEBGL_COMPONENT_TYPES = {
    5120: Int8Array,
    5121: Uint8Array,
    5122: Int16Array,
    5123: Uint16Array,
    5125: Uint32Array,
    5126: Float32Array
};
const WEBGL_FILTERS = {
    9728: NearestFilter,
    9729: LinearFilter,
    9984: NearestMipmapNearestFilter,
    9985: LinearMipmapNearestFilter,
    9986: NearestMipmapLinearFilter,
    9987: LinearMipmapLinearFilter
};
const WEBGL_WRAPPINGS = {
    33071: ClampToEdgeWrapping,
    33648: MirroredRepeatWrapping,
    10497: RepeatWrapping
};
const WEBGL_TYPE_SIZES = {
    'SCALAR': 1,
    'VEC2': 2,
    'VEC3': 3,
    'VEC4': 4,
    'MAT2': 4,
    'MAT3': 9,
    'MAT4': 16
};
const ATTRIBUTES = {
    POSITION: 'position',
    NORMAL: 'normal',
    TANGENT: 'tangent',
    TEXCOORD_0: 'uv',
    TEXCOORD_1: 'uv2',
    COLOR_0: 'color',
    WEIGHTS_0: 'skinWeight',
    JOINTS_0: 'skinIndex',
};
const PATH_PROPERTIES$1 = {
    scale: 'scale',
    translation: 'position',
    rotation: 'quaternion',
    weights: 'morphTargetInfluences'
};
const INTERPOLATION = {
    CUBICSPLINE: undefined,
    LINEAR: InterpolateLinear,
    STEP: InterpolateDiscrete
};
const ALPHA_MODES = {
    OPAQUE: 'OPAQUE',
    MASK: 'MASK',
    BLEND: 'BLEND'
};
function createDefaultMaterial(cache) {
    if (cache['DefaultMaterial'] === undefined) {
        cache['DefaultMaterial'] = new MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0x000000,
            metalness: 1,
            roughness: 1,
            transparent: false,
            depthTest: true,
            side: FrontSide
        });
    }
    return cache['DefaultMaterial'];
}
function addUnknownExtensionsToUserData(knownExtensions, object, objectDef) {
    for (const name in objectDef.extensions) {
        if (knownExtensions[name] === undefined) {
            object.userData.gltfExtensions = object.userData.gltfExtensions || {};
            object.userData.gltfExtensions[name] = objectDef.extensions[name];
        }
    }
}
function assignExtrasToUserData(object, gltfDef) {
    if (gltfDef.extras !== undefined) {
        if (typeof gltfDef.extras === 'object') {
            Object.assign(object.userData, gltfDef.extras);
        }
        else {
            console.warn('THREE.GLTFLoader: Ignoring primitive type .extras, ' + gltfDef.extras);
        }
    }
}
function addMorphTargets(geometry, targets, parser) {
    let hasMorphPosition = false;
    let hasMorphNormal = false;
    for (let i = 0, il = targets.length; i < il; i++) {
        const target = targets[i];
        if (target.POSITION !== undefined)
            hasMorphPosition = true;
        if (target.NORMAL !== undefined)
            hasMorphNormal = true;
        if (hasMorphPosition && hasMorphNormal)
            break;
    }
    if (!hasMorphPosition && !hasMorphNormal)
        return Promise.resolve(geometry);
    const pendingPositionAccessors = [];
    const pendingNormalAccessors = [];
    for (let i = 0, il = targets.length; i < il; i++) {
        const target = targets[i];
        if (hasMorphPosition) {
            const pendingAccessor = target.POSITION !== undefined
                ? parser.getDependency('accessor', target.POSITION)
                : geometry.attributes.position;
            pendingPositionAccessors.push(pendingAccessor);
        }
        if (hasMorphNormal) {
            const pendingAccessor = target.NORMAL !== undefined
                ? parser.getDependency('accessor', target.NORMAL)
                : geometry.attributes.normal;
            pendingNormalAccessors.push(pendingAccessor);
        }
    }
    return Promise.all([
        Promise.all(pendingPositionAccessors),
        Promise.all(pendingNormalAccessors)
    ]).then(accessors => {
        const morphPositions = accessors[0];
        const morphNormals = accessors[1];
        if (hasMorphPosition)
            geometry.morphAttributes.position = morphPositions;
        if (hasMorphNormal)
            geometry.morphAttributes.normal = morphNormals;
        geometry.morphTargetsRelative = true;
        return geometry;
    });
}
function updateMorphTargets(mesh, meshDef) {
    mesh.updateMorphTargets();
    if (meshDef.weights !== undefined) {
        for (let i = 0, il = meshDef.weights.length; i < il; i++) {
            mesh.morphTargetInfluences[i] = meshDef.weights[i];
        }
    }
    if (meshDef.extras && Array.isArray(meshDef.extras.targetNames)) {
        const targetNames = meshDef.extras.targetNames;
        if (mesh.morphTargetInfluences.length === targetNames.length) {
            mesh.morphTargetDictionary = {};
            for (let i = 0, il = targetNames.length; i < il; i++) {
                mesh.morphTargetDictionary[targetNames[i]] = i;
            }
        }
        else {
            console.warn('THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.');
        }
    }
}
function createPrimitiveKey(primitiveDef) {
    const dracoExtension = primitiveDef.extensions && primitiveDef.extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION];
    let geometryKey;
    if (dracoExtension) {
        geometryKey = 'draco:' + dracoExtension.bufferView
            + ':' + dracoExtension.indices
            + ':' + createAttributesKey(dracoExtension.attributes);
    }
    else {
        geometryKey = primitiveDef.indices + ':' + createAttributesKey(primitiveDef.attributes) + ':' + primitiveDef.mode;
    }
    return geometryKey;
}
function createAttributesKey(attributes) {
    let attributesKey = '';
    const keys = Object.keys(attributes).sort();
    for (let i = 0, il = keys.length; i < il; i++) {
        attributesKey += keys[i] + ':' + attributes[keys[i]] + ';';
    }
    return attributesKey;
}
function getNormalizedComponentScale(constructor) {
    switch (constructor) {
        case Int8Array:
            return 1 / 127;
        case Uint8Array:
            return 1 / 255;
        case Int16Array:
            return 1 / 32767;
        case Uint16Array:
            return 1 / 65535;
        default:
            throw new Error('THREE.GLTFLoader: Unsupported normalized accessor component type.');
    }
}
class GLTFParser {
    constructor(json = {}, options = {}) {
        this.json = {};
        this.extensions = {};
        this.plugins = {};
        this.options = {};
        this.cache = new GLTFRegistry();
        this.associations = new Map();
        this.primitiveCache = {};
        this.meshCache = { refs: {}, uses: {} };
        this.cameraCache = { refs: {}, uses: {} };
        this.lightCache = { refs: {}, uses: {} };
        this.sourceCache = {};
        this.textureCache = {};
        this.nodeNamesUsed = {};
        this.json = json;
        this.options = options;
        this.textureLoader = new TextureLoader(this.options.manager);
        this.textureLoader.setCrossOrigin(this.options.crossOrigin);
        this.textureLoader.setRequestHeader(this.options.requestHeader);
        this.fileLoader = new FileLoader(this.options.manager);
        this.fileLoader.setResponseType('arraybuffer');
        if (this.options.crossOrigin === 'use-credentials') {
            this.fileLoader.setWithCredentials(true);
        }
    }
    setExtensions(extensions) {
        this.extensions = extensions;
    }
    setPlugins(plugins) {
        this.plugins = plugins;
    }
    parse(onLoad, onError) {
        const parser = this;
        const json = this.json;
        const extensions = this.extensions;
        this.cache.removeAll();
        this._invokeAll(ext => ext._markDefs && ext._markDefs());
        Promise.all(this._invokeAll(ext => ext.beforeRoot && ext.beforeRoot())).then(() => Promise.all([
            parser.getDependencies('scene'),
            parser.getDependencies('animation'),
            parser.getDependencies('camera'),
        ])).then(dependencies => {
            const result = {
                scene: dependencies[0][json.scene || 0],
                scenes: dependencies[0],
                animations: dependencies[1],
                cameras: dependencies[2],
                asset: json.asset,
                parser,
                userData: {}
            };
            addUnknownExtensionsToUserData(extensions, result, json);
            assignExtrasToUserData(result, json);
            Promise.all(parser._invokeAll(function (ext) {
                return ext.afterRoot && ext.afterRoot(result);
            })).then(function () {
                onLoad(result);
            });
        }).catch(onError);
    }
    _markDefs() {
        const nodeDefs = this.json.nodes || [];
        const skinDefs = this.json.skins || [];
        const meshDefs = this.json.meshes || [];
        for (let skinIndex = 0, skinLength = skinDefs.length; skinIndex < skinLength; skinIndex++) {
            const joints = skinDefs[skinIndex].joints;
            for (let i = 0, il = joints.length; i < il; i++) {
                nodeDefs[joints[i]].isBone = true;
            }
        }
        for (let nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex++) {
            const nodeDef = nodeDefs[nodeIndex];
            if (nodeDef.mesh !== undefined) {
                this._addNodeRef(this.meshCache, nodeDef.mesh);
                if (nodeDef.skin !== undefined) {
                    meshDefs[nodeDef.mesh].isSkinnedMesh = true;
                }
            }
            if (nodeDef.camera !== undefined) {
                this._addNodeRef(this.cameraCache, nodeDef.camera);
            }
        }
    }
    _addNodeRef(cache, index) {
        if (index === undefined)
            return;
        if (cache.refs[index] === undefined) {
            cache.refs[index] = cache.uses[index] = 0;
        }
        cache.refs[index]++;
    }
    _getNodeRef(cache, index, object) {
        if (cache.refs[index] <= 1)
            return object;
        const ref = object.clone();
        const updateMappings = (original, clone) => {
            const mappings = this.associations.get(original);
            if (mappings != null) {
                this.associations.set(clone, mappings);
            }
            for (const [i, child] of original.children.entries()) {
                updateMappings(child, clone.children[i]);
            }
        };
        updateMappings(object, ref);
        ref.name += '_instance_' + (cache.uses[index]++);
        return ref;
    }
    _invokeOne(func) {
        const extensions = Object.values(this.plugins);
        extensions.push(this);
        for (let i = 0; i < extensions.length; i++) {
            const result = func(extensions[i]);
            if (result)
                return result;
        }
        return null;
    }
    _invokeAll(func) {
        const extensions = Object.values(this.plugins);
        extensions.unshift(this);
        const pending = [];
        for (let i = 0; i < extensions.length; i++) {
            const result = func(extensions[i]);
            if (result)
                pending.push(result);
        }
        return pending;
    }
    getDependency(type, index) {
        const cacheKey = type + ':' + index;
        let dependency = this.cache.get(cacheKey);
        if (!dependency) {
            switch (type) {
                case 'scene':
                    dependency = this.loadScene(index);
                    break;
                case 'node':
                    dependency = this.loadNode(index);
                    break;
                case 'mesh':
                    dependency = this._invokeOne(ext => ext.loadMesh && ext.loadMesh(index));
                    break;
                case 'accessor':
                    dependency = this.loadAccessor(index);
                    break;
                case 'bufferView':
                    dependency = this._invokeOne(ext => ext.loadBufferView && ext.loadBufferView(index));
                    break;
                case 'buffer':
                    dependency = this.loadBuffer(index);
                    break;
                case 'material':
                    dependency = this._invokeOne(ext => ext.loadMaterial && ext.loadMaterial(index));
                    break;
                case 'texture':
                    dependency = this._invokeOne(ext => ext.loadTexture && ext.loadTexture(index));
                    break;
                case 'skin':
                    dependency = this.loadSkin(index);
                    break;
                case 'animation':
                    dependency = this.loadAnimation(index);
                    break;
                case 'camera':
                    dependency = this.loadCamera(index);
                    break;
                default:
                    throw new Error('Unknown type: ' + type);
            }
            this.cache.add(cacheKey, dependency);
        }
        return dependency;
    }
    getDependencies(type) {
        let dependencies = this.cache.get(type);
        if (!dependencies) {
            const parser = this;
            const defs = this.json[type + (type === 'mesh' ? 'es' : 's')] || [];
            dependencies = Promise.all(defs.map((def, index) => parser.getDependency(type, index)));
            this.cache.add(type, dependencies);
        }
        return dependencies;
    }
    loadBuffer(bufferIndex) {
        const bufferDef = this.json.buffers[bufferIndex];
        const loader = this.fileLoader;
        if (bufferDef.type && bufferDef.type !== 'arraybuffer') {
            throw new Error('THREE.GLTFLoader: ' + bufferDef.type + ' buffer type is not supported.');
        }
        if (bufferDef.uri === undefined && bufferIndex === 0) {
            return Promise.resolve(this.extensions[EXTENSIONS.KHR_BINARY_GLTF].body);
        }
        const options = this.options;
        return new Promise(function (resolve, reject) {
            loader.load(LoaderUtils.resolveURL(bufferDef.uri, options.path), resolve, undefined, function () {
                reject(new Error('THREE.GLTFLoader: Failed to load buffer "' + bufferDef.uri + '".'));
            });
        });
    }
    loadBufferView(bufferViewIndex) {
        const bufferViewDef = this.json.bufferViews[bufferViewIndex];
        return this.getDependency('buffer', bufferViewDef.buffer).then(buffer => {
            const byteLength = bufferViewDef.byteLength || 0;
            const byteOffset = bufferViewDef.byteOffset || 0;
            return buffer.slice(byteOffset, byteOffset + byteLength);
        });
    }
    loadAccessor(accessorIndex) {
        const parser = this;
        const json = this.json;
        const accessorDef = this.json.accessors[accessorIndex];
        if (accessorDef.bufferView === undefined && accessorDef.sparse === undefined) {
            const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
            const TypedArray = WEBGL_COMPONENT_TYPES[accessorDef.componentType];
            const normalized = accessorDef.normalized === true;
            const array = new TypedArray(accessorDef.count * itemSize);
            return Promise.resolve(new BufferAttribute(array, itemSize, normalized));
        }
        const pendingBufferViews = [];
        if (accessorDef.bufferView !== undefined) {
            pendingBufferViews.push(this.getDependency('bufferView', accessorDef.bufferView));
        }
        else {
            pendingBufferViews.push(null);
        }
        if (accessorDef.sparse !== undefined) {
            pendingBufferViews.push(this.getDependency('bufferView', accessorDef.sparse.indices.bufferView));
            pendingBufferViews.push(this.getDependency('bufferView', accessorDef.sparse.values.bufferView));
        }
        return Promise.all(pendingBufferViews).then(function (bufferViews) {
            const bufferView = bufferViews[0];
            const itemSize = WEBGL_TYPE_SIZES[accessorDef.type];
            const TypedArray = WEBGL_COMPONENT_TYPES[accessorDef.componentType];
            const elementBytes = TypedArray.BYTES_PER_ELEMENT;
            const itemBytes = elementBytes * itemSize;
            const byteOffset = accessorDef.byteOffset || 0;
            const byteStride = accessorDef.bufferView !== undefined ? json.bufferViews[accessorDef.bufferView].byteStride : undefined;
            const normalized = accessorDef.normalized === true;
            let array, bufferAttribute;
            if (byteStride && byteStride !== itemBytes) {
                const ibSlice = Math.floor(byteOffset / byteStride);
                const ibCacheKey = 'InterleavedBuffer:' + accessorDef.bufferView + ':' + accessorDef.componentType + ':' + ibSlice + ':' + accessorDef.count;
                let ib = parser.cache.get(ibCacheKey);
                if (!ib) {
                    array = new TypedArray(bufferView, ibSlice * byteStride, accessorDef.count * byteStride / elementBytes);
                    ib = new InterleavedBuffer(array, byteStride / elementBytes);
                    parser.cache.add(ibCacheKey, ib);
                }
                bufferAttribute = new InterleavedBufferAttribute(ib, itemSize, (byteOffset % byteStride) / elementBytes, normalized);
            }
            else {
                if (bufferView === null) {
                    array = new TypedArray(accessorDef.count * itemSize);
                }
                else {
                    array = new TypedArray(bufferView, byteOffset, accessorDef.count * itemSize);
                }
                bufferAttribute = new BufferAttribute(array, itemSize, normalized);
            }
            if (accessorDef.sparse !== undefined) {
                const itemSizeIndices = WEBGL_TYPE_SIZES.SCALAR;
                const TypedArrayIndices = WEBGL_COMPONENT_TYPES[accessorDef.sparse.indices.componentType];
                const byteOffsetIndices = accessorDef.sparse.indices.byteOffset || 0;
                const byteOffsetValues = accessorDef.sparse.values.byteOffset || 0;
                const sparseIndices = new TypedArrayIndices(bufferViews[1], byteOffsetIndices, accessorDef.sparse.count * itemSizeIndices);
                const sparseValues = new TypedArray(bufferViews[2], byteOffsetValues, accessorDef.sparse.count * itemSize);
                if (bufferView !== null) {
                    bufferAttribute = new BufferAttribute(bufferAttribute.array.slice(), bufferAttribute.itemSize, bufferAttribute.normalized);
                }
                for (let i = 0, il = sparseIndices.length; i < il; i++) {
                    const index = sparseIndices[i];
                    bufferAttribute.setX(index, sparseValues[i * itemSize]);
                    if (itemSize >= 2)
                        bufferAttribute.setY(index, sparseValues[i * itemSize + 1]);
                    if (itemSize >= 3)
                        bufferAttribute.setZ(index, sparseValues[i * itemSize + 2]);
                    if (itemSize >= 4)
                        bufferAttribute.setW(index, sparseValues[i * itemSize + 3]);
                    if (itemSize >= 5)
                        throw new Error('THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.');
                }
            }
            return bufferAttribute;
        });
    }
    loadTexture(textureIndex) {
        const json = this.json;
        const options = this.options;
        const textureDef = json.textures[textureIndex];
        const sourceIndex = textureDef.source;
        const sourceDef = json.images[sourceIndex];
        let loader = this.textureLoader;
        if (sourceDef.uri) {
            const handler = options.manager.getHandler(sourceDef.uri);
            if (handler !== null)
                loader = handler;
        }
        return this.loadTextureImage(textureIndex, sourceIndex, loader);
    }
    loadTextureImage(textureIndex, sourceIndex, loader) {
        const parser = this;
        const json = this.json;
        this.options;
        const textureDef = json.textures[textureIndex];
        const sourceDef = json.images[sourceIndex];
        const cacheKey = (sourceDef.uri || sourceDef.bufferView) + ':' + textureDef.sampler;
        if (this.textureCache[cacheKey]) {
            return this.textureCache[cacheKey];
        }
        const promise = this.loadImageSource(sourceIndex, loader).then(function (texture) {
            texture.flipY = false;
            if (textureDef.name)
                texture.name = textureDef.name;
            const samplers = json.samplers || {};
            const sampler = samplers[textureDef.sampler] || {};
            texture.magFilter = WEBGL_FILTERS[sampler.magFilter] || LinearFilter;
            texture.minFilter = WEBGL_FILTERS[sampler.minFilter] || LinearMipmapLinearFilter;
            texture.wrapS = WEBGL_WRAPPINGS[sampler.wrapS] || RepeatWrapping;
            texture.wrapT = WEBGL_WRAPPINGS[sampler.wrapT] || RepeatWrapping;
            parser.associations.set(texture, { textures: textureIndex });
            return texture;
        }).catch(function () {
            return null;
        });
        this.textureCache[cacheKey] = promise;
        return promise;
    }
    loadImageSource(sourceIndex, loader) {
        const parser = this;
        const json = this.json;
        const options = this.options;
        if (this.sourceCache[sourceIndex] !== undefined) {
            return this.sourceCache[sourceIndex].then((texture) => texture.clone());
        }
        const sourceDef = json.images[sourceIndex];
        const URL = global.URL;
        let sourceURI = sourceDef.uri || '';
        let isObjectURL = false;
        if (sourceDef.bufferView !== undefined) {
            sourceURI = parser.getDependency('bufferView', sourceDef.bufferView).then(function (bufferView) {
                isObjectURL = true;
                const blob = new Blob([bufferView], { type: sourceDef.mimeType });
                sourceURI = URL.createObjectURL(blob);
                return sourceURI;
            });
        }
        else if (sourceDef.uri === undefined) {
            throw new Error('THREE.GLTFLoader: Image ' + sourceIndex + ' is missing URI and bufferView');
        }
        const promise = Promise.resolve(sourceURI).then(function (sourceURI) {
            LoaderUtils.resolveURL(sourceURI, options.path);
            return new Promise(function (resolve, reject) {
                loader.load(LoaderUtils.resolveURL(sourceURI, options.path), resolve, undefined, reject);
            });
        }).then(function (texture) {
            if (isObjectURL === true) {
                URL.revokeObjectURL(sourceURI);
            }
            return texture;
        }).catch((error) => {
            if (GLTFLoader.LOG_TEXTURE_LOAD_ERROR) {
                console.error('THREE.GLTFLoader: Couldn\'t load texture', sourceURI);
            }
            throw error;
        });
        this.textureCache[sourceIndex] = promise;
        return promise;
    }
    assignTexture(materialParams, mapName, mapDef, colorSpace) {
        const parser = this;
        return this.getDependency('texture', mapDef.index).then(function (texture) {
            if (mapDef.texCoord !== undefined && mapDef.texCoord != 0 && !(mapName === 'aoMap' && mapDef.texCoord == 1)) {
                console.warn('THREE.GLTFLoader: Custom UV set ' + mapDef.texCoord + ' for texture ' + mapName + ' not yet supported.');
            }
            if (parser.extensions[EXTENSIONS.KHR_TEXTURE_TRANSFORM]) {
                const transform = mapDef.extensions !== undefined ? mapDef.extensions[EXTENSIONS.KHR_TEXTURE_TRANSFORM] : undefined;
                if (transform) {
                    const gltfReference = parser.associations.get(texture);
                    texture = parser.extensions[EXTENSIONS.KHR_TEXTURE_TRANSFORM].extendTexture(texture, transform);
                    parser.associations.set(texture, gltfReference);
                }
            }
            if (texture && colorSpace !== undefined) {
                texture.colorSpace = colorSpace;
            }
            materialParams[mapName] = texture;
            return texture;
        });
    }
    assignFinalMaterial(mesh) {
        const geometry = mesh.geometry;
        let material = mesh.material;
        const useDerivativeTangents = geometry.attributes.tangent === undefined;
        const useVertexColors = geometry.attributes.color !== undefined;
        const useFlatShading = geometry.attributes.normal === undefined;
        if (mesh.isPoints) {
            const cacheKey = 'PointsMaterial:' + material.uuid;
            let pointsMaterial = this.cache.get(cacheKey);
            if (!pointsMaterial) {
                pointsMaterial = new PointsMaterial();
                Material.prototype.copy.call(pointsMaterial, material);
                pointsMaterial.color.copy(material.color);
                pointsMaterial.map = material.map;
                pointsMaterial.sizeAttenuation = false;
                this.cache.add(cacheKey, pointsMaterial);
            }
            material = pointsMaterial;
        }
        else if (mesh.isLine) {
            const cacheKey = 'LineBasicMaterial:' + material.uuid;
            let lineMaterial = this.cache.get(cacheKey);
            if (!lineMaterial) {
                lineMaterial = new LineBasicMaterial();
                Material.prototype.copy.call(lineMaterial, material);
                lineMaterial.color.copy(material.color);
                this.cache.add(cacheKey, lineMaterial);
            }
            material = lineMaterial;
        }
        if (useDerivativeTangents || useVertexColors || useFlatShading) {
            let cacheKey = 'ClonedMaterial:' + material.uuid + ':';
            if (useDerivativeTangents)
                cacheKey += 'derivative-tangents:';
            if (useVertexColors)
                cacheKey += 'vertex-colors:';
            if (useFlatShading)
                cacheKey += 'flat-shading:';
            let cachedMaterial = this.cache.get(cacheKey);
            if (!cachedMaterial) {
                cachedMaterial = material.clone();
                if (useVertexColors)
                    cachedMaterial.vertexColors = true;
                if (useFlatShading)
                    cachedMaterial.flatShading = true;
                if (useDerivativeTangents) {
                    if (cachedMaterial.normalScale)
                        cachedMaterial.normalScale.y *= -1;
                    if (cachedMaterial.clearcoatNormalScale)
                        cachedMaterial.clearcoatNormalScale.y *= -1;
                }
                this.cache.add(cacheKey, cachedMaterial);
                this.associations.set(cachedMaterial, this.associations.get(material));
            }
            material = cachedMaterial;
        }
        if (material.aoMap && geometry.attributes.uv2 === undefined && geometry.attributes.uv !== undefined) {
            geometry.setAttribute('uv2', geometry.attributes.uv);
        }
        mesh.material = material;
    }
    getMaterialType() {
        return MeshStandardMaterial;
    }
    loadMaterial(materialIndex) {
        const parser = this;
        const json = this.json;
        const extensions = this.extensions;
        const materialDef = json.materials[materialIndex];
        let materialType;
        const materialParams = {};
        const materialExtensions = materialDef.extensions || {};
        const pending = [];
        if (materialExtensions[EXTENSIONS.KHR_MATERIALS_UNLIT]) {
            const kmuExtension = extensions[EXTENSIONS.KHR_MATERIALS_UNLIT];
            materialType = kmuExtension.getMaterialType();
            pending.push(kmuExtension.extendParams(materialParams, materialDef, parser));
        }
        else {
            const metallicRoughness = materialDef.pbrMetallicRoughness || {};
            materialParams.color = new Color(1.0, 1.0, 1.0);
            materialParams.opacity = 1.0;
            if (Array.isArray(metallicRoughness.baseColorFactor)) {
                const array = metallicRoughness.baseColorFactor;
                materialParams.color.setRGB(array[0], array[1], array[2], LinearSRGBColorSpace);
                materialParams.opacity = array[3];
            }
            if (metallicRoughness.baseColorTexture !== undefined) {
                pending.push(parser.assignTexture(materialParams, 'map', metallicRoughness.baseColorTexture, SRGBColorSpace));
            }
            materialParams.metalness = metallicRoughness.metallicFactor !== undefined ? metallicRoughness.metallicFactor : 1.0;
            materialParams.roughness = metallicRoughness.roughnessFactor !== undefined ? metallicRoughness.roughnessFactor : 1.0;
            if (metallicRoughness.metallicRoughnessTexture !== undefined) {
                pending.push(parser.assignTexture(materialParams, 'metalnessMap', metallicRoughness.metallicRoughnessTexture));
                pending.push(parser.assignTexture(materialParams, 'roughnessMap', metallicRoughness.metallicRoughnessTexture));
            }
            materialType = this._invokeOne(function (ext) {
                return ext.getMaterialType && ext.getMaterialType(materialIndex);
            });
            pending.push(Promise.all(this._invokeAll(function (ext) {
                return ext.extendMaterialParams && ext.extendMaterialParams(materialIndex, materialParams);
            })));
        }
        if (materialDef.doubleSided === true) {
            materialParams.side = DoubleSide;
        }
        const alphaMode = materialDef.alphaMode || ALPHA_MODES.OPAQUE;
        if (alphaMode === ALPHA_MODES.BLEND) {
            materialParams.transparent = true;
            materialParams.depthWrite = false;
        }
        else {
            materialParams.transparent = false;
            if (alphaMode === ALPHA_MODES.MASK) {
                materialParams.alphaTest = materialDef.alphaCutoff !== undefined ? materialDef.alphaCutoff : 0.5;
            }
        }
        if (materialDef.normalTexture !== undefined && materialType !== MeshBasicMaterial) {
            pending.push(parser.assignTexture(materialParams, 'normalMap', materialDef.normalTexture));
            materialParams.normalScale = new Vector2(1, 1);
            if (materialDef.normalTexture.scale !== undefined) {
                const scale = materialDef.normalTexture.scale;
                materialParams.normalScale.set(scale, scale);
            }
        }
        if (materialDef.occlusionTexture !== undefined && materialType !== MeshBasicMaterial) {
            pending.push(parser.assignTexture(materialParams, 'aoMap', materialDef.occlusionTexture));
            if (materialDef.occlusionTexture.strength !== undefined) {
                materialParams.aoMapIntensity = materialDef.occlusionTexture.strength;
            }
        }
        if (materialDef.emissiveFactor !== undefined && materialType !== MeshBasicMaterial) {
            const emissiveFactor = materialDef.emissiveFactor;
            materialParams.emissive = new Color().setRGB(emissiveFactor[0], emissiveFactor[1], emissiveFactor[2], LinearSRGBColorSpace);
        }
        if (materialDef.emissiveTexture !== undefined && materialType !== MeshBasicMaterial) {
            pending.push(parser.assignTexture(materialParams, 'emissiveMap', materialDef.emissiveTexture, SRGBColorSpace));
        }
        return Promise.all(pending).then(function () {
            const material = new materialType(materialParams);
            if (materialDef.name)
                material.name = materialDef.name;
            assignExtrasToUserData(material, materialDef);
            parser.associations.set(material, { materials: materialIndex });
            if (materialDef.extensions)
                addUnknownExtensionsToUserData(extensions, material, materialDef);
            return material;
        });
    }
    createUniqueName(originalName) {
        const sanitizedName = PropertyBinding.sanitizeNodeName(originalName || '');
        let name = sanitizedName;
        for (let i = 1; this.nodeNamesUsed[name]; ++i) {
            name = sanitizedName + '_' + i;
        }
        this.nodeNamesUsed[name] = true;
        return name;
    }
    loadGeometries(primitives) {
        const parser = this;
        const extensions = this.extensions;
        const cache = this.primitiveCache;
        function createDracoPrimitive(primitive) {
            return extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION]
                .decodePrimitive(primitive, parser)
                .then(function (geometry) {
                return addPrimitiveAttributes(geometry, primitive, parser);
            });
        }
        const pending = [];
        for (let i = 0, il = primitives.length; i < il; i++) {
            const primitive = primitives[i];
            const cacheKey = createPrimitiveKey(primitive);
            const cached = cache[cacheKey];
            if (cached) {
                pending.push(cached.promise);
            }
            else {
                let geometryPromise;
                if (primitive.extensions && primitive.extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION]) {
                    geometryPromise = createDracoPrimitive(primitive);
                }
                else {
                    geometryPromise = addPrimitiveAttributes(new BufferGeometry(), primitive, parser);
                }
                cache[cacheKey] = { primitive: primitive, promise: geometryPromise };
                pending.push(geometryPromise);
            }
        }
        return Promise.all(pending);
    }
    loadMesh(meshIndex) {
        const parser = this;
        const json = this.json;
        const extensions = this.extensions;
        const meshDef = json.meshes[meshIndex];
        const primitives = meshDef.primitives;
        const pending = [];
        for (let i = 0, il = primitives.length; i < il; i++) {
            const material = primitives[i].material === undefined
                ? createDefaultMaterial(this.cache)
                : this.getDependency('material', primitives[i].material);
            pending.push(material);
        }
        pending.push(parser.loadGeometries(primitives));
        return Promise.all(pending).then(results => {
            const materials = results.slice(0, results.length - 1);
            const geometries = results[results.length - 1];
            const meshes = [];
            for (let i = 0, il = geometries.length; i < il; i++) {
                const geometry = geometries[i];
                const primitive = primitives[i];
                let mesh;
                const material = materials[i];
                if (primitive.mode === WEBGL_CONSTANTS$1.TRIANGLES ||
                    primitive.mode === WEBGL_CONSTANTS$1.TRIANGLE_STRIP ||
                    primitive.mode === WEBGL_CONSTANTS$1.TRIANGLE_FAN ||
                    primitive.mode === undefined) {
                    mesh = meshDef.isSkinnedMesh === true
                        ? new SkinnedMesh(geometry, material)
                        : new Mesh(geometry, material);
                    if (mesh.isSkinnedMesh === true && !mesh.geometry.attributes.skinWeight.normalized) {
                        mesh.normalizeSkinWeights();
                    }
                    if (primitive.mode === WEBGL_CONSTANTS$1.TRIANGLE_STRIP) {
                        mesh.geometry = toTrianglesDrawMode(mesh.geometry, TriangleStripDrawMode);
                    }
                    else if (primitive.mode === WEBGL_CONSTANTS$1.TRIANGLE_FAN) {
                        mesh.geometry = toTrianglesDrawMode(mesh.geometry, TriangleFanDrawMode);
                    }
                }
                else if (primitive.mode === WEBGL_CONSTANTS$1.LINES) {
                    mesh = new LineSegments(geometry, material);
                }
                else if (primitive.mode === WEBGL_CONSTANTS$1.LINE_STRIP) {
                    mesh = new Line(geometry, material);
                }
                else if (primitive.mode === WEBGL_CONSTANTS$1.LINE_LOOP) {
                    mesh = new LineLoop(geometry, material);
                }
                else if (primitive.mode === WEBGL_CONSTANTS$1.POINTS) {
                    mesh = new Points(geometry, material);
                }
                else {
                    throw new Error('THREE.GLTFLoader: Primitive mode unsupported: ' + primitive.mode);
                }
                if (Object.keys(mesh.geometry.morphAttributes).length > 0) {
                    updateMorphTargets(mesh, meshDef);
                }
                mesh.name = parser.createUniqueName(meshDef.name || ('mesh_' + meshIndex));
                assignExtrasToUserData(mesh, meshDef);
                if (primitive.extensions)
                    addUnknownExtensionsToUserData(extensions, mesh, primitive);
                parser.assignFinalMaterial(mesh);
                meshes.push(mesh);
            }
            for (let i = 0, il = meshes.length; i < il; i++) {
                parser.associations.set(meshes[i], {
                    meshes: meshIndex,
                    primitives: i
                });
            }
            if (meshes.length === 1) {
                return meshes[0];
            }
            const group = new Group();
            parser.associations.set(group, { meshes: meshIndex });
            for (let i = 0, il = meshes.length; i < il; i++) {
                group.add(meshes[i]);
            }
            return group;
        });
    }
    loadCamera(cameraIndex) {
        let camera;
        const cameraDef = this.json.cameras[cameraIndex];
        const params = cameraDef[cameraDef.type];
        if (!params) {
            console.warn('THREE.GLTFLoader: Missing camera parameters.');
            return;
        }
        if (cameraDef.type === 'perspective') {
            camera = new PerspectiveCamera(MathUtils.radToDeg(params.yfov), params.aspectRatio || 1, params.znear || 1, params.zfar || 2e6);
        }
        else if (cameraDef.type === 'orthographic') {
            camera = new OrthographicCamera(-params.xmag, params.xmag, params.ymag, -params.ymag, params.znear, params.zfar);
        }
        if (cameraDef.name)
            camera.name = this.createUniqueName(cameraDef.name);
        assignExtrasToUserData(camera, cameraDef);
        return Promise.resolve(camera);
    }
    loadSkin(skinIndex) {
        const skinDef = this.json.skins[skinIndex];
        const skinEntry = { joints: skinDef.joints };
        if (skinDef.inverseBindMatrices === undefined) {
            return Promise.resolve(skinEntry);
        }
        return this.getDependency('accessor', skinDef.inverseBindMatrices).then(accessor => {
            skinEntry.inverseBindMatrices = accessor;
            return skinEntry;
        });
    }
    loadAnimation(animationIndex) {
        const json = this.json;
        const animationDef = json.animations[animationIndex];
        const pendingNodes = [];
        const pendingInputAccessors = [];
        const pendingOutputAccessors = [];
        const pendingSamplers = [];
        const pendingTargets = [];
        for (let i = 0, il = animationDef.channels.length; i < il; i++) {
            const channel = animationDef.channels[i];
            const sampler = animationDef.samplers[channel.sampler];
            const target = channel.target;
            const name = target.node;
            const input = animationDef.parameters !== undefined ? animationDef.parameters[sampler.input] : sampler.input;
            const output = animationDef.parameters !== undefined ? animationDef.parameters[sampler.output] : sampler.output;
            pendingNodes.push(this.getDependency('node', name));
            pendingInputAccessors.push(this.getDependency('accessor', input));
            pendingOutputAccessors.push(this.getDependency('accessor', output));
            pendingSamplers.push(sampler);
            pendingTargets.push(target);
        }
        return Promise.all([
            Promise.all(pendingNodes),
            Promise.all(pendingInputAccessors),
            Promise.all(pendingOutputAccessors),
            Promise.all(pendingSamplers),
            Promise.all(pendingTargets)
        ]).then(dependencies => {
            const nodes = dependencies[0];
            const inputAccessors = dependencies[1];
            const outputAccessors = dependencies[2];
            const samplers = dependencies[3];
            const targets = dependencies[4];
            const tracks = [];
            for (let i = 0, il = nodes.length; i < il; i++) {
                const node = nodes[i];
                const inputAccessor = inputAccessors[i];
                const outputAccessor = outputAccessors[i];
                const sampler = samplers[i];
                const target = targets[i];
                if (node === undefined)
                    continue;
                node.updateMatrix();
                node.matrixAutoUpdate = true;
                let TypedKeyframeTrack;
                switch (PATH_PROPERTIES$1[target.path]) {
                    case PATH_PROPERTIES$1.weights:
                        TypedKeyframeTrack = NumberKeyframeTrack;
                        break;
                    case PATH_PROPERTIES$1.rotation:
                        TypedKeyframeTrack = QuaternionKeyframeTrack;
                        break;
                    case PATH_PROPERTIES$1.translation:
                    case PATH_PROPERTIES$1.scale:
                    default:
                        TypedKeyframeTrack = VectorKeyframeTrack;
                        break;
                }
                const targetName = node.name ? node.name : node.uuid;
                const interpolation = sampler.interpolation !== undefined ? INTERPOLATION[sampler.interpolation] : InterpolateLinear;
                const targetNames = [];
                if (PATH_PROPERTIES$1[target.path] === PATH_PROPERTIES$1.weights) {
                    node.traverse(function (object) {
                        if (object.morphTargetInfluences) {
                            targetNames.push(object.name ? object.name : object.uuid);
                        }
                    });
                }
                else {
                    targetNames.push(targetName);
                }
                let outputArray = outputAccessor.array;
                if (outputAccessor.normalized) {
                    const scale = getNormalizedComponentScale(outputArray.constructor);
                    const scaled = new Float32Array(outputArray.length);
                    for (let j = 0, jl = outputArray.length; j < jl; j++) {
                        scaled[j] = outputArray[j] * scale;
                    }
                    outputArray = scaled;
                }
                for (let j = 0, jl = targetNames.length; j < jl; j++) {
                    const track = new TypedKeyframeTrack(targetNames[j] + '.' + PATH_PROPERTIES$1[target.path], inputAccessor.array, outputArray, interpolation);
                    if (sampler.interpolation === 'CUBICSPLINE') {
                        track.createInterpolant = function InterpolantFactoryMethodGLTFCubicSpline(result) {
                            const interpolantType = (this instanceof QuaternionKeyframeTrack)
                                ? GLTFCubicSplineQuaternionInterpolant
                                : GLTFCubicSplineInterpolant;
                            return new interpolantType(this.times, this.values, this.getValueSize() / 3, result);
                        };
                        track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = true;
                    }
                    tracks.push(track);
                }
            }
            const name = animationDef.name ? animationDef.name : 'animation_' + animationIndex;
            return new AnimationClip(name, undefined, tracks);
        });
    }
    createNodeMesh(nodeIndex) {
        const json = this.json;
        const parser = this;
        const nodeDef = json.nodes[nodeIndex];
        if (nodeDef.mesh === undefined)
            return null;
        return parser.getDependency('mesh', nodeDef.mesh).then(function (mesh) {
            const node = parser._getNodeRef(parser.meshCache, nodeDef.mesh, mesh);
            if (nodeDef.weights !== undefined) {
                node.traverse(o => {
                    if (!o.isMesh)
                        return;
                    for (let i = 0, il = nodeDef.weights.length; i < il; i++) {
                        o.morphTargetInfluences[i] = nodeDef.weights[i];
                    }
                });
            }
            return node;
        });
    }
    loadNode(nodeIndex) {
        const json = this.json;
        const extensions = this.extensions;
        const parser = this;
        const nodeDef = json.nodes[nodeIndex];
        const nodeName = nodeDef.name ? parser.createUniqueName(nodeDef.name) : '';
        return (function () {
            const pending = [];
            const meshPromise = parser._invokeOne(function (ext) {
                return ext.createNodeMesh && ext.createNodeMesh(nodeIndex);
            });
            if (meshPromise) {
                pending.push(meshPromise);
            }
            if (nodeDef.camera !== undefined) {
                pending.push(parser.getDependency('camera', nodeDef.camera).then(function (camera) {
                    return parser._getNodeRef(parser.cameraCache, nodeDef.camera, camera);
                }));
            }
            parser._invokeAll((ext) => {
                return ext.createNodeAttachment && ext.createNodeAttachment(nodeIndex);
            }).forEach(promise => {
                pending.push(promise);
            });
            return Promise.all(pending);
        }()).then(objects => {
            let node;
            if (nodeDef.isBone === true) {
                node = new Bone();
            }
            else if (objects.length > 1) {
                node = new Group();
            }
            else if (objects.length === 1) {
                node = objects[0];
            }
            else {
                node = new Object3D();
            }
            if (node !== objects[0]) {
                for (let i = 0, il = objects.length; i < il; i++) {
                    node.add(objects[i]);
                }
            }
            if (nodeDef.name) {
                node.userData.name = nodeDef.name;
                node.name = nodeName;
            }
            assignExtrasToUserData(node, nodeDef);
            if (nodeDef.extensions)
                addUnknownExtensionsToUserData(extensions, node, nodeDef);
            if (nodeDef.matrix !== undefined) {
                const matrix = new Matrix4();
                matrix.fromArray(nodeDef.matrix);
                node.applyMatrix4(matrix);
            }
            else {
                if (nodeDef.translation !== undefined) {
                    node.position.fromArray(nodeDef.translation);
                }
                if (nodeDef.rotation !== undefined) {
                    node.quaternion.fromArray(nodeDef.rotation);
                }
                if (nodeDef.scale !== undefined) {
                    node.scale.fromArray(nodeDef.scale);
                }
            }
            if (!parser.associations.has(node)) {
                parser.associations.set(node, {});
            }
            parser.associations.get(node).nodes = nodeIndex;
            return node;
        });
    }
    loadScene(sceneIndex) {
        const json = this.json;
        const extensions = this.extensions;
        const sceneDef = this.json.scenes[sceneIndex];
        const parser = this;
        const scene = new Group();
        if (sceneDef.name)
            scene.name = parser.createUniqueName(sceneDef.name);
        assignExtrasToUserData(scene, sceneDef);
        if (sceneDef.extensions)
            addUnknownExtensionsToUserData(extensions, scene, sceneDef);
        const nodeIds = sceneDef.nodes || [];
        const pending = [];
        for (let i = 0, il = nodeIds.length; i < il; i++) {
            pending.push(buildNodeHierarchy(nodeIds[i], scene, json, parser));
        }
        return Promise.all(pending).then(() => {
            const reduceAssociations = (node) => {
                const reducedAssociations = new Map();
                for (const [key, value] of parser.associations) {
                    if (key instanceof Material || key instanceof Texture) {
                        reducedAssociations.set(key, value);
                    }
                }
                node.traverse((node) => {
                    const mappings = parser.associations.get(node);
                    if (mappings != null) {
                        reducedAssociations.set(node, mappings);
                    }
                });
                return reducedAssociations;
            };
            parser.associations = reduceAssociations(scene);
            return scene;
        });
    }
}
function buildNodeHierarchy(nodeId, parentObject, json, parser) {
    const nodeDef = json.nodes[nodeId];
    return parser.getDependency('node', nodeId).then(node => {
        if (nodeDef.skin === undefined)
            return node;
        let skinEntry;
        return parser.getDependency('skin', nodeDef.skin).then(skin => {
            skinEntry = skin;
            const pendingJoints = [];
            for (let i = 0, il = skinEntry.joints.length; i < il; i++) {
                pendingJoints.push(parser.getDependency('node', skinEntry.joints[i]));
            }
            return Promise.all(pendingJoints);
        }).then(jointNodes => {
            node.traverse(mesh => {
                if (!mesh.isMesh)
                    return;
                const bones = [];
                const boneInverses = [];
                for (let j = 0, jl = jointNodes.length; j < jl; j++) {
                    const jointNode = jointNodes[j];
                    if (jointNode) {
                        bones.push(jointNode);
                        const mat = new Matrix4();
                        if (skinEntry.inverseBindMatrices !== undefined) {
                            mat.fromArray(skinEntry.inverseBindMatrices.array, j * 16);
                        }
                        boneInverses.push(mat);
                    }
                    else {
                        console.warn('THREE.GLTFLoader: Joint "%s" could not be found.', skinEntry.joints[j]);
                    }
                }
                mesh.bind(new Skeleton(bones, boneInverses), mesh.matrixWorld);
            });
            return node;
        });
    }).then(node => {
        parentObject.add(node);
        const pending = [];
        if (nodeDef.children) {
            const children = nodeDef.children;
            for (let i = 0, il = children.length; i < il; i++) {
                const child = children[i];
                pending.push(buildNodeHierarchy(child, node, json, parser));
            }
        }
        return Promise.all(pending);
    });
}
function computeBounds(geometry, primitiveDef, parser) {
    const attributes = primitiveDef.attributes;
    const box = new Box3();
    if (attributes.POSITION !== undefined) {
        const accessor = parser.json.accessors[attributes.POSITION];
        const min = accessor.min;
        const max = accessor.max;
        if (min !== undefined && max !== undefined) {
            box.set(new Vector3(min[0], min[1], min[2]), new Vector3(max[0], max[1], max[2]));
            if (accessor.normalized) {
                const boxScale = getNormalizedComponentScale(WEBGL_COMPONENT_TYPES[accessor.componentType]);
                box.min.multiplyScalar(boxScale);
                box.max.multiplyScalar(boxScale);
            }
        }
        else {
            console.warn('THREE.GLTFLoader: Missing min/max properties for accessor POSITION.');
            return;
        }
    }
    else {
        return;
    }
    const targets = primitiveDef.targets;
    if (targets !== undefined) {
        const maxDisplacement = new Vector3();
        const vector = new Vector3();
        for (let i = 0, il = targets.length; i < il; i++) {
            const target = targets[i];
            if (target.POSITION !== undefined) {
                const accessor = parser.json.accessors[target.POSITION];
                const min = accessor.min;
                const max = accessor.max;
                if (min !== undefined && max !== undefined) {
                    vector.setX(Math.max(Math.abs(min[0]), Math.abs(max[0])));
                    vector.setY(Math.max(Math.abs(min[1]), Math.abs(max[1])));
                    vector.setZ(Math.max(Math.abs(min[2]), Math.abs(max[2])));
                    if (accessor.normalized) {
                        const boxScale = getNormalizedComponentScale(WEBGL_COMPONENT_TYPES[accessor.componentType]);
                        vector.multiplyScalar(boxScale);
                    }
                    maxDisplacement.max(vector);
                }
                else {
                    console.warn('THREE.GLTFLoader: Missing min/max properties for accessor POSITION.');
                }
            }
        }
        box.expandByVector(maxDisplacement);
    }
    geometry.boundingBox = box;
    const sphere = new Sphere();
    box.getCenter(sphere.center);
    sphere.radius = box.min.distanceTo(box.max) / 2;
    geometry.boundingSphere = sphere;
}
function addPrimitiveAttributes(geometry, primitiveDef, parser) {
    const attributes = primitiveDef.attributes;
    const pending = [];
    function assignAttributeAccessor(accessorIndex, attributeName) {
        return parser.getDependency('accessor', accessorIndex)
            .then(accessor => {
            geometry.setAttribute(attributeName, accessor);
        });
    }
    for (const gltfAttributeName in attributes) {
        const threeAttributeName = ATTRIBUTES[gltfAttributeName] || gltfAttributeName.toLowerCase();
        if (threeAttributeName in geometry.attributes)
            continue;
        pending.push(assignAttributeAccessor(attributes[gltfAttributeName], threeAttributeName));
    }
    if (primitiveDef.indices !== undefined && !geometry.index) {
        const accessor = parser.getDependency('accessor', primitiveDef.indices).then(accessor => {
            geometry.setIndex(accessor);
        });
        pending.push(accessor);
    }
    if (ColorManagement.workingColorSpace !== LinearSRGBColorSpace && 'COLOR_0' in attributes) {
        console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${ColorManagement.workingColorSpace}" not supported.`);
    }
    assignExtrasToUserData(geometry, primitiveDef);
    computeBounds(geometry, primitiveDef, parser);
    return Promise.all(pending).then(() => {
        return primitiveDef.targets !== undefined
            ? addMorphTargets(geometry, primitiveDef.targets, parser)
            : geometry;
    });
}
function toTrianglesDrawMode(geometry, drawMode) {
    let index = geometry.getIndex();
    if (index === null) {
        const indices = [];
        const position = geometry.getAttribute('position');
        if (position !== undefined) {
            for (let i = 0; i < position.count; i++) {
                indices.push(i);
            }
            geometry.setIndex(indices);
            index = geometry.getIndex();
        }
        else {
            console.error('THREE.GLTFLoader.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.');
            return geometry;
        }
    }
    const numberOfTriangles = index.count - 2;
    const newIndices = [];
    if (drawMode === TriangleFanDrawMode) {
        for (let i = 1; i <= numberOfTriangles; i++) {
            newIndices.push(index.getX(0));
            newIndices.push(index.getX(i));
            newIndices.push(index.getX(i + 1));
        }
    }
    else {
        for (let i = 0; i < numberOfTriangles; i++) {
            if (i % 2 === 0) {
                newIndices.push(index.getX(i));
                newIndices.push(index.getX(i + 1));
                newIndices.push(index.getX(i + 2));
            }
            else {
                newIndices.push(index.getX(i + 2));
                newIndices.push(index.getX(i + 1));
                newIndices.push(index.getX(i));
            }
        }
    }
    if ((newIndices.length / 3) !== numberOfTriangles) {
        console.error('THREE.GLTFLoader.toTrianglesDrawMode(): Unable to generate correct amount of triangles.');
    }
    const newGeometry = geometry.clone();
    newGeometry.setIndex(newIndices);
    return newGeometry;
}

const _taskCache = new WeakMap();
class DRACOLoader extends Loader {
    constructor(manager) {
        super(manager);
        this.decoderPath = dirname(fileURLToPath(import.meta.url)) + sep;
        this.decoderConfig = {};
        this.decoderPending = null;
        this.workerLimit = 4;
        this.workerPool = [];
        this.workerNextTaskID = 1;
        this.workerSourceURL = '';
        this.defaultAttributeIDs = {
            position: 'POSITION',
            normal: 'NORMAL',
            color: 'COLOR',
            uv: 'TEX_COORD'
        };
        this.defaultAttributeTypes = {
            position: 'Float32Array',
            normal: 'Float32Array',
            color: 'Float32Array',
            uv: 'Float32Array'
        };
    }
    setDecoderConfig(config) {
        this.decoderConfig = config;
        return this;
    }
    setWorkerLimit(workerLimit) {
        this.workerLimit = workerLimit;
        return this;
    }
    load(url, onLoad, onProgress, onError) {
        const loader = new FileLoader(this.manager);
        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');
        loader.setRequestHeader(this.requestHeader);
        loader.setWithCredentials(this.withCredentials);
        loader.load(url, (buffer) => {
            const taskConfig = {
                attributeIDs: this.defaultAttributeIDs,
                attributeTypes: this.defaultAttributeTypes,
                useUniqueIDs: false
            };
            this.decodeGeometry(buffer, taskConfig)
                .then(onLoad)
                .catch(onError);
        }, onProgress, onError);
    }
    decodeDracoFile(buffer, callback, attributeIDs, attributeTypes) {
        const taskConfig = {
            attributeIDs: attributeIDs || this.defaultAttributeIDs,
            attributeTypes: attributeTypes || this.defaultAttributeTypes,
            useUniqueIDs: !!attributeIDs
        };
        this.decodeGeometry(buffer, taskConfig).then(callback);
    }
    decodeGeometry(buffer, taskConfig) {
        const taskKey = JSON.stringify(taskConfig);
        if (_taskCache.has(buffer)) {
            const cachedTask = _taskCache.get(buffer);
            if (cachedTask.key === taskKey) {
                return cachedTask.promise;
            }
            else if (buffer.byteLength === 0) {
                throw new Error('THREE.DRACOLoader: Unable to re-decode a buffer with different ' +
                    'settings. Buffer has already been transferred.');
            }
        }
        let worker;
        const taskID = this.workerNextTaskID++;
        const taskCost = buffer.byteLength;
        const geometryPending = this._getWorker(taskID, taskCost)
            .then((_worker) => {
            worker = _worker;
            return new Promise((resolve, reject) => {
                worker._callbacks[taskID] = { resolve, reject };
                worker.postMessage({ type: 'decode', id: taskID, taskConfig, buffer }, [buffer]);
            });
        })
            .then((message) => this._createGeometry(message.geometry));
        geometryPending
            .catch(() => true)
            .then(() => {
            if (worker && taskID) {
                this._releaseTask(worker, taskID);
            }
        });
        _taskCache.set(buffer, {
            key: taskKey,
            promise: geometryPending
        });
        return geometryPending;
    }
    _createGeometry(geometryData) {
        const geometry = new BufferGeometry();
        if (geometryData.index) {
            geometry.setIndex(new BufferAttribute(geometryData.index.array, 1));
        }
        for (const attribute of geometryData.attributes) {
            const name = attribute.name;
            const array = attribute.array;
            const itemSize = attribute.itemSize;
            geometry.setAttribute(name, new BufferAttribute(array, itemSize));
        }
        return geometry;
    }
    preload() {
        this._initDecoder();
        return this;
    }
    _loadLibrary(url, responseType) {
        const loader = new FileLoader(this.manager);
        loader.setPath(this.decoderPath);
        loader.setResponseType(responseType);
        loader.setWithCredentials(this.withCredentials);
        return new Promise((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
        });
    }
    _initDecoder() {
        if (this.decoderPending)
            return this.decoderPending;
        const useJS = typeof WebAssembly !== 'object' || this.decoderConfig.type === 'js';
        if (useJS) {
            this.workerSourceURL = this.decoderPath + 'draco_worker.js';
            this.decoderPending = Promise.resolve();
        }
        else {
            this.workerSourceURL = this.decoderPath + 'draco_worker_wasm.js';
            this.decoderPending = this._loadLibrary('draco_decoder.wasm', 'arraybuffer')
                .then((wasmBinary) => {
                this.decoderConfig.wasmBinary = wasmBinary;
            });
        }
        return this.decoderPending;
    }
    _getWorker(taskID, taskCost) {
        return this._initDecoder().then(() => {
            if (this.workerPool.length < this.workerLimit) {
                const worker = new Worker(this.workerSourceURL);
                worker._callbacks = {};
                worker._taskCosts = {};
                worker._taskLoad = 0;
                worker.postMessage({ type: 'init', decoderConfig: this.decoderConfig });
                worker.on('message', (message) => {
                    switch (message.type) {
                        case 'decode':
                            worker._callbacks[message.id].resolve(message);
                            break;
                        case 'error':
                            worker._callbacks[message.id].reject(message);
                            break;
                        default:
                            console.error('THREE.DRACOLoader: Unexpected message, "' + message.type + '"');
                    }
                });
                this.workerPool.push(worker);
            }
            else {
                this.workerPool.sort(function (a, b) {
                    return a._taskLoad > b._taskLoad ? -1 : 1;
                });
            }
            const worker = this.workerPool[this.workerPool.length - 1];
            worker._taskCosts[taskID] = taskCost;
            worker._taskLoad += taskCost;
            return worker;
        });
    }
    _releaseTask(worker, taskID) {
        worker._taskLoad -= worker._taskCosts[taskID];
        delete worker._callbacks[taskID];
        delete worker._taskCosts[taskID];
    }
    dispose() {
        for (let i = 0; i < this.workerPool.length; ++i) {
            this.workerPool[i].terminate();
        }
        this.workerPool.length = 0;
        return this;
    }
}

let _renderer;
let fullscreenQuadGeometry;
let fullscreenQuadMaterial;
let fullscreenQuad;

function decompress( texture, maxTextureSize = Infinity, renderer = null ) {

	if ( ! fullscreenQuadGeometry ) fullscreenQuadGeometry = new PlaneGeometry( 2, 2, 1, 1 );
	if ( ! fullscreenQuadMaterial ) fullscreenQuadMaterial = new ShaderMaterial( {
		uniforms: { blitTexture: new Uniform( texture ) },
		vertexShader: `
            varying vec2 vUv;
            void main(){
                vUv = uv;
                gl_Position = vec4(position.xy * 1.0,0.,.999999);
            }`,
		fragmentShader: `
            uniform sampler2D blitTexture; 
            varying vec2 vUv;

            void main(){ 
                gl_FragColor = vec4(vUv.xy, 0, 1);
                
                #ifdef IS_SRGB
                gl_FragColor = LinearTosRGB( texture2D( blitTexture, vUv) );
                #else
                gl_FragColor = texture2D( blitTexture, vUv);
                #endif
            }`
	} );

	fullscreenQuadMaterial.uniforms.blitTexture.value = texture;
	fullscreenQuadMaterial.defines.IS_SRGB = texture.colorSpace == SRGBColorSpace;
	fullscreenQuadMaterial.needsUpdate = true;

	if ( ! fullscreenQuad ) {

		fullscreenQuad = new Mesh( fullscreenQuadGeometry, fullscreenQuadMaterial );
		fullscreenQuad.frustrumCulled = false;

	}

	const _camera = new PerspectiveCamera();
	const _scene = new Scene();
	_scene.add( fullscreenQuad );

	if ( ! renderer ) {

		renderer = _renderer = new WebGLRenderer( { antialias: false } );

	}

	renderer.setSize( Math.min( texture.image.width, maxTextureSize ), Math.min( texture.image.height, maxTextureSize ) );
	renderer.clear();
	renderer.render( _scene, _camera );

	const readableTexture = new Texture( renderer.domElement );

	readableTexture.minFilter = texture.minFilter;
	readableTexture.magFilter = texture.magFilter;
	readableTexture.wrapS = texture.wrapS;
	readableTexture.wrapT = texture.wrapT;
	readableTexture.name = texture.name;

	if ( _renderer ) {

		_renderer.dispose();
		_renderer = null;

	}

	return readableTexture;

}

const KHR_mesh_quantization_ExtraAttrTypes = {
    POSITION: [
        'byte',
        'byte normalized',
        'unsigned byte',
        'unsigned byte normalized',
        'short',
        'short normalized',
        'unsigned short',
        'unsigned short normalized',
    ],
    NORMAL: [
        'byte normalized',
        'short normalized',
    ],
    TANGENT: [
        'byte normalized',
        'short normalized',
    ],
    TEXCOORD: [
        'byte',
        'byte normalized',
        'unsigned byte',
        'short',
        'short normalized',
        'unsigned short',
    ],
};
const GLTFExporterUtils = {
    insertKeyframe: function (track, time) {
        const tolerance = 0.001;
        const valueSize = track.getValueSize();
        const times = new track.TimeBufferType(track.times.length + 1);
        const values = new track.ValueBufferType(track.values.length + valueSize);
        const interpolant = track.createInterpolant(new track.ValueBufferType(valueSize));
        let index;
        if (track.times.length === 0) {
            times[0] = time;
            for (let i = 0; i < valueSize; i++) {
                values[i] = 0;
            }
            index = 0;
        }
        else if (time < track.times[0]) {
            if (Math.abs(track.times[0] - time) < tolerance)
                return 0;
            times[0] = time;
            times.set(track.times, 1);
            values.set(interpolant.evaluate(time), 0);
            values.set(track.values, valueSize);
            index = 0;
        }
        else if (time > track.times[track.times.length - 1]) {
            if (Math.abs(track.times[track.times.length - 1] - time) < tolerance) {
                return track.times.length - 1;
            }
            times[times.length - 1] = time;
            times.set(track.times, 0);
            values.set(track.values, 0);
            values.set(interpolant.evaluate(time), track.values.length);
            index = times.length - 1;
        }
        else {
            for (let i = 0; i < track.times.length; i++) {
                if (Math.abs(track.times[i] - time) < tolerance)
                    return i;
                if (track.times[i] < time && track.times[i + 1] > time) {
                    times.set(track.times.slice(0, i + 1), 0);
                    times[i + 1] = time;
                    times.set(track.times.slice(i + 1), i + 2);
                    values.set(track.values.slice(0, (i + 1) * valueSize), 0);
                    values.set(interpolant.evaluate(time), (i + 1) * valueSize);
                    values.set(track.values.slice((i + 1) * valueSize), (i + 2) * valueSize);
                    index = i + 1;
                    break;
                }
            }
        }
        track.times = times;
        track.values = values;
        return index;
    },
    mergeMorphTargetTracks: function (clip, root) {
        const tracks = [];
        const mergedTracks = {};
        const sourceTracks = clip.tracks;
        for (let i = 0; i < sourceTracks.length; ++i) {
            let sourceTrack = sourceTracks[i];
            const sourceTrackBinding = PropertyBinding.parseTrackName(sourceTrack.name);
            const sourceTrackNode = PropertyBinding.findNode(root, sourceTrackBinding.nodeName);
            if (sourceTrackBinding.propertyName !== 'morphTargetInfluences' || sourceTrackBinding.propertyIndex === undefined) {
                tracks.push(sourceTrack);
                continue;
            }
            if (sourceTrack.createInterpolant !== sourceTrack.InterpolantFactoryMethodDiscrete
                && sourceTrack.createInterpolant !== sourceTrack.InterpolantFactoryMethodLinear) {
                if (sourceTrack.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline) {
                    throw new Error('THREE.GLTFExporter: Cannot merge tracks with glTF CUBICSPLINE interpolation.');
                }
                console.warn('THREE.GLTFExporter: Morph target interpolation mode not yet supported. Using LINEAR instead.');
                sourceTrack = sourceTrack.clone();
                sourceTrack.setInterpolation(InterpolateLinear);
            }
            const targetCount = sourceTrackNode.morphTargetInfluences.length;
            const targetIndex = sourceTrackNode.morphTargetDictionary[sourceTrackBinding.propertyIndex];
            if (targetIndex === undefined) {
                throw new Error('THREE.GLTFExporter: Morph target name not found: ' + sourceTrackBinding.propertyIndex);
            }
            let mergedTrack;
            if (mergedTracks[sourceTrackNode.uuid] === undefined) {
                mergedTrack = sourceTrack.clone();
                const values = new mergedTrack.ValueBufferType(targetCount * mergedTrack.times.length);
                for (let j = 0; j < mergedTrack.times.length; j++) {
                    values[j * targetCount + targetIndex] = mergedTrack.values[j];
                }
                mergedTrack.name = (sourceTrackBinding.nodeName || '') + '.morphTargetInfluences';
                mergedTrack.values = values;
                mergedTracks[sourceTrackNode.uuid] = mergedTrack;
                tracks.push(mergedTrack);
                continue;
            }
            const sourceInterpolant = sourceTrack.createInterpolant(new sourceTrack.ValueBufferType(1));
            mergedTrack = mergedTracks[sourceTrackNode.uuid];
            for (let j = 0; j < mergedTrack.times.length; j++) {
                mergedTrack.values[j * targetCount + targetIndex] = sourceInterpolant.evaluate(mergedTrack.times[j]);
            }
            for (let j = 0; j < sourceTrack.times.length; j++) {
                const keyframeIndex = this.insertKeyframe(mergedTrack, sourceTrack.times[j]);
                mergedTrack.values[keyframeIndex * targetCount + targetIndex] = sourceTrack.values[j];
            }
        }
        clip.tracks = tracks;
        return clip;
    }
};
class GLTFExporter {
    constructor() {
        this.pluginCallbacks = [];
        this.register(function (writer) {
            return new GLTFLightExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsUnlitExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsTransmissionExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsVolumeExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsIorExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsSpecularExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsClearcoatExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsDispersionExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsIridescenceExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsSheenExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsAnisotropyExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsEmissiveStrengthExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMaterialsBumpExtension(writer);
        });
        this.register(function (writer) {
            return new GLTFMeshGpuInstancing(writer);
        });
    }
    register(callback) {
        if (this.pluginCallbacks.indexOf(callback) === -1) {
            this.pluginCallbacks.push(callback);
        }
        return this;
    }
    unregister(callback) {
        if (this.pluginCallbacks.indexOf(callback) !== -1) {
            this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(callback), 1);
        }
        return this;
    }
    parse(input, onDone, onError, options) {
        const writer = new GLTFWriter();
        const plugins = [];
        for (let i = 0, il = this.pluginCallbacks.length; i < il; i++) {
            plugins.push(this.pluginCallbacks[i](writer));
        }
        writer.setPlugins(plugins);
        writer.write(input, onDone, options).catch(onError);
    }
    parseAsync(input, options) {
        const scope = this;
        return new Promise(function (resolve, reject) {
            scope.parse(input, resolve, reject, options);
        });
    }
}
GLTFExporter.Utils = GLTFExporterUtils;
const WEBGL_CONSTANTS = {
    POINTS: 0x0000,
    LINES: 0x0001,
    LINE_LOOP: 0x0002,
    LINE_STRIP: 0x0003,
    TRIANGLES: 0x0004,
    TRIANGLE_STRIP: 0x0005,
    TRIANGLE_FAN: 0x0006,
    BYTE: 0x1400,
    UNSIGNED_BYTE: 0x1401,
    SHORT: 0x1402,
    UNSIGNED_SHORT: 0x1403,
    INT: 0x1404,
    UNSIGNED_INT: 0x1405,
    FLOAT: 0x1406,
    ARRAY_BUFFER: 0x8892,
    ELEMENT_ARRAY_BUFFER: 0x8893,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    NEAREST_MIPMAP_NEAREST: 0x2700,
    LINEAR_MIPMAP_NEAREST: 0x2701,
    NEAREST_MIPMAP_LINEAR: 0x2702,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    CLAMP_TO_EDGE: 33071,
    MIRRORED_REPEAT: 33648,
    REPEAT: 10497
};
const KHR_MESH_QUANTIZATION = 'KHR_mesh_quantization';
const THREE_TO_WEBGL = {};
THREE_TO_WEBGL[NearestFilter] = WEBGL_CONSTANTS.NEAREST;
THREE_TO_WEBGL[NearestMipmapNearestFilter] = WEBGL_CONSTANTS.NEAREST_MIPMAP_NEAREST;
THREE_TO_WEBGL[NearestMipmapLinearFilter] = WEBGL_CONSTANTS.NEAREST_MIPMAP_LINEAR;
THREE_TO_WEBGL[LinearFilter] = WEBGL_CONSTANTS.LINEAR;
THREE_TO_WEBGL[LinearMipmapNearestFilter] = WEBGL_CONSTANTS.LINEAR_MIPMAP_NEAREST;
THREE_TO_WEBGL[LinearMipmapLinearFilter] = WEBGL_CONSTANTS.LINEAR_MIPMAP_LINEAR;
THREE_TO_WEBGL[ClampToEdgeWrapping] = WEBGL_CONSTANTS.CLAMP_TO_EDGE;
THREE_TO_WEBGL[RepeatWrapping] = WEBGL_CONSTANTS.REPEAT;
THREE_TO_WEBGL[MirroredRepeatWrapping] = WEBGL_CONSTANTS.MIRRORED_REPEAT;
const PATH_PROPERTIES = {
    scale: 'scale',
    position: 'translation',
    quaternion: 'rotation',
    morphTargetInfluences: 'weights'
};
const DEFAULT_SPECULAR_COLOR = new Color();
const GLB_HEADER_BYTES = 12;
const GLB_HEADER_MAGIC = 0x46546C67;
const GLB_VERSION = 2;
const GLB_CHUNK_PREFIX_BYTES = 8;
const GLB_CHUNK_TYPE_JSON = 0x4E4F534A;
const GLB_CHUNK_TYPE_BIN = 0x004E4942;
function equalArray(array1, array2) {
    return (array1.length === array2.length) && array1.every(function (element, index) {
        return element === array2[index];
    });
}
function stringToArrayBuffer(text) {
    return new TextEncoder().encode(text).buffer;
}
function isIdentityMatrix(matrix) {
    return equalArray(matrix.elements, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}
function getMinMax(attribute, start, count) {
    const output = {
        min: new Array(attribute.itemSize).fill(Number.POSITIVE_INFINITY),
        max: new Array(attribute.itemSize).fill(Number.NEGATIVE_INFINITY)
    };
    for (let i = start; i < start + count; i++) {
        for (let a = 0; a < attribute.itemSize; a++) {
            let value;
            if (attribute.itemSize > 4) {
                value = attribute.array[i * attribute.itemSize + a];
            }
            else {
                if (a === 0)
                    value = attribute.getX(i);
                else if (a === 1)
                    value = attribute.getY(i);
                else if (a === 2)
                    value = attribute.getZ(i);
                else if (a === 3)
                    value = attribute.getW(i);
                if (attribute.normalized === true) {
                    value = MathUtils.normalize(value, attribute.array);
                }
            }
            output.min[a] = Math.min(output.min[a], value);
            output.max[a] = Math.max(output.max[a], value);
        }
    }
    return output;
}
function getPaddedBufferSize(bufferSize) {
    return Math.ceil(bufferSize / 4) * 4;
}
function getPaddedArrayBuffer(arrayBuffer, paddingByte = 0) {
    const paddedLength = getPaddedBufferSize(arrayBuffer.byteLength);
    if (paddedLength !== arrayBuffer.byteLength) {
        const array = new Uint8Array(paddedLength);
        array.set(new Uint8Array(arrayBuffer));
        if (paddingByte !== 0) {
            for (let i = arrayBuffer.byteLength; i < paddedLength; i++) {
                array[i] = paddingByte;
            }
        }
        return array.buffer;
    }
    return arrayBuffer;
}
function getCanvas() {
    return document.createElement('canvas');
}
class GLTFWriter {
    constructor() {
        this.plugins = [];
        this.options = {};
        this.pending = [];
        this.byteOffset = 0;
        this.buffers = [];
        this.nodeMap = new Map();
        this.skins = [];
        this.extensionsUsed = {};
        this.extensionsRequired = {};
        this.uids = new Map();
        this.uid = 0;
        this.json = {
            asset: {
                version: '2.0',
                generator: 'THREE.GLTFExporter r' + REVISION
            }
        };
        this.cache = {
            meshes: new Map(),
            attributes: new Map(),
            attributesNormalized: new Map(),
            materials: new Map(),
            textures: new Map(),
            images: new Map()
        };
    }
    setPlugins(plugins) {
        this.plugins = plugins;
    }
    async write(input, onDone, options = {}) {
        this.options = Object.assign({
            binary: false,
            trs: false,
            onlyVisible: true,
            maxTextureSize: Infinity,
            animations: [],
            includeCustomExtensions: false
        }, options);
        if (this.options.animations.length > 0) {
            this.options.trs = true;
        }
        this.processInput(input);
        await Promise.all(this.pending);
        const writer = this;
        const buffers = writer.buffers;
        const json = writer.json;
        options = writer.options;
        const extensionsUsed = writer.extensionsUsed;
        const extensionsRequired = writer.extensionsRequired;
        const blob = new Blob(buffers, { type: 'application/octet-stream' });
        const extensionsUsedList = Object.keys(extensionsUsed);
        const extensionsRequiredList = Object.keys(extensionsRequired);
        if (extensionsUsedList.length > 0)
            json.extensionsUsed = extensionsUsedList;
        if (extensionsRequiredList.length > 0)
            json.extensionsRequired = extensionsRequiredList;
        if (json.buffers && json.buffers.length > 0)
            json.buffers[0].byteLength = blob.size;
        if (options.binary === true) {
            blob.arrayBuffer().then((arrayBuffer) => {
                const binaryChunk = getPaddedArrayBuffer(arrayBuffer);
                const binaryChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES));
                binaryChunkPrefix.setUint32(0, binaryChunk.byteLength, true);
                binaryChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_BIN, true);
                const jsonChunk = getPaddedArrayBuffer(stringToArrayBuffer(JSON.stringify(json)), 0x20);
                const jsonChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES));
                jsonChunkPrefix.setUint32(0, jsonChunk.byteLength, true);
                jsonChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_JSON, true);
                const header = new ArrayBuffer(GLB_HEADER_BYTES);
                const headerView = new DataView(header);
                headerView.setUint32(0, GLB_HEADER_MAGIC, true);
                headerView.setUint32(4, GLB_VERSION, true);
                const totalByteLength = GLB_HEADER_BYTES
                    + jsonChunkPrefix.byteLength + jsonChunk.byteLength
                    + binaryChunkPrefix.byteLength + binaryChunk.byteLength;
                headerView.setUint32(8, totalByteLength, true);
                const glbBlob = new Blob([
                    header,
                    jsonChunkPrefix,
                    jsonChunk,
                    binaryChunkPrefix,
                    binaryChunk
                ], { type: 'application/octet-stream' });
                return glbBlob.arrayBuffer();
            }).then((glbArrayBuffer) => {
                onDone(Buffer.from(glbArrayBuffer));
            });
        }
        else {
            if (json.buffers && json.buffers.length > 0) {
                blob.arrayBuffer().then((arrayBuffer) => {
                    json.buffers[0].uri = 'data:application/octet-stream;base64,' + Buffer.from(arrayBuffer).toString('base64');
                    onDone(json);
                });
            }
            else {
                onDone(json);
            }
        }
    }
    serializeUserData(object, objectDef) {
        if (Object.keys(object.userData).length === 0)
            return;
        const options = this.options;
        const extensionsUsed = this.extensionsUsed;
        try {
            const json = JSON.parse(JSON.stringify(object.userData));
            if (options.includeCustomExtensions && json.gltfExtensions) {
                if (objectDef.extensions === undefined)
                    objectDef.extensions = {};
                for (const extensionName in json.gltfExtensions) {
                    objectDef.extensions[extensionName] = json.gltfExtensions[extensionName];
                    extensionsUsed[extensionName] = true;
                }
                delete json.gltfExtensions;
            }
            if (Object.keys(json).length > 0)
                objectDef.extras = json;
        }
        catch (error) {
            console.warn('THREE.GLTFExporter: userData of \'' + object.name + '\' ' +
                'won\'t be serialized because of JSON.stringify error - ' + error.message);
        }
    }
    getUID(attribute, isRelativeCopy = false) {
        if (this.uids.has(attribute) === false) {
            const uids = new Map();
            uids.set(true, this.uid++);
            uids.set(false, this.uid++);
            this.uids.set(attribute, uids);
        }
        const uids = this.uids.get(attribute);
        return uids.get(isRelativeCopy);
    }
    isNormalizedNormalAttribute(normal) {
        const cache = this.cache;
        if (cache.attributesNormalized.has(normal))
            return false;
        const v = new Vector3();
        for (let i = 0, il = normal.count; i < il; i++) {
            if (Math.abs(v.fromBufferAttribute(normal, i).length() - 1.0) > 0.0005)
                return false;
        }
        return true;
    }
    createNormalizedNormalAttribute(normal) {
        const cache = this.cache;
        if (cache.attributesNormalized.has(normal))
            return cache.attributesNormalized.get(normal);
        const attribute = normal.clone();
        const v = new Vector3();
        for (let i = 0, il = attribute.count; i < il; i++) {
            v.fromBufferAttribute(attribute, i);
            if (v.x === 0 && v.y === 0 && v.z === 0) {
                v.setX(1.0);
            }
            else {
                v.normalize();
            }
            attribute.setXYZ(i, v.x, v.y, v.z);
        }
        cache.attributesNormalized.set(normal, attribute);
        return attribute;
    }
    applyTextureTransform(mapDef, texture) {
        let didTransform = false;
        const transformDef = {};
        if (texture.offset.x !== 0 || texture.offset.y !== 0) {
            transformDef.offset = texture.offset.toArray();
            didTransform = true;
        }
        if (texture.rotation !== 0) {
            transformDef.rotation = texture.rotation;
            didTransform = true;
        }
        if (texture.repeat.x !== 1 || texture.repeat.y !== 1) {
            transformDef.scale = texture.repeat.toArray();
            didTransform = true;
        }
        if (didTransform) {
            mapDef.extensions = mapDef.extensions || {};
            mapDef.extensions['KHR_texture_transform'] = transformDef;
            this.extensionsUsed['KHR_texture_transform'] = true;
        }
    }
    buildMetalRoughTexture(metalnessMap, roughnessMap) {
        if (metalnessMap === roughnessMap)
            return metalnessMap;
        function getEncodingConversion(map) {
            if (map.colorSpace === SRGBColorSpace) {
                return function SRGBToLinear(c) {
                    return (c < 0.04045) ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
                };
            }
            return function LinearToLinear(c) {
                return c;
            };
        }
        console.warn('THREE.GLTFExporter: Merged metalnessMap and roughnessMap textures.');
        if (metalnessMap instanceof CompressedTexture) {
            metalnessMap = decompress(metalnessMap);
        }
        if (roughnessMap instanceof CompressedTexture) {
            roughnessMap = decompress(roughnessMap);
        }
        const metalness = metalnessMap ? metalnessMap.image : null;
        const roughness = roughnessMap ? roughnessMap.image : null;
        const width = Math.max(metalness ? metalness.width : 0, roughness ? roughness.width : 0);
        const height = Math.max(metalness ? metalness.height : 0, roughness ? roughness.height : 0);
        const canvas = getCanvas();
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#00ffff';
        context.fillRect(0, 0, width, height);
        const composite = context.getImageData(0, 0, width, height);
        if (metalness) {
            context.drawImage(metalness, 0, 0, width, height);
            const convert = getEncodingConversion(metalnessMap);
            const data = context.getImageData(0, 0, width, height).data;
            for (let i = 2; i < data.length; i += 4) {
                composite.data[i] = convert(data[i] / 256) * 256;
            }
        }
        if (roughness) {
            context.drawImage(roughness, 0, 0, width, height);
            const convert = getEncodingConversion(roughnessMap);
            const data = context.getImageData(0, 0, width, height).data;
            for (let i = 1; i < data.length; i += 4) {
                composite.data[i] = convert(data[i] / 256) * 256;
            }
        }
        context.putImageData(composite, 0, 0);
        const reference = metalnessMap || roughnessMap;
        const texture = reference.clone();
        texture.source = new Source(canvas);
        texture.colorSpace = NoColorSpace;
        texture.channel = (metalnessMap || roughnessMap).channel;
        if (metalnessMap && roughnessMap && metalnessMap.channel !== roughnessMap.channel) {
            console.warn('THREE.GLTFExporter: UV channels for metalnessMap and roughnessMap textures must match.');
        }
        return texture;
    }
    processBuffer(buffer) {
        const json = this.json;
        const buffers = this.buffers;
        if (!json.buffers)
            json.buffers = [{ byteLength: 0 }];
        buffers.push(buffer);
        return 0;
    }
    processBufferView(attribute, componentType, start, count, target) {
        const json = this.json;
        if (!json.bufferViews)
            json.bufferViews = [];
        let componentSize;
        switch (componentType) {
            case WEBGL_CONSTANTS.BYTE:
            case WEBGL_CONSTANTS.UNSIGNED_BYTE:
                componentSize = 1;
                break;
            case WEBGL_CONSTANTS.SHORT:
            case WEBGL_CONSTANTS.UNSIGNED_SHORT:
                componentSize = 2;
                break;
            default:
                componentSize = 4;
        }
        let byteStride = attribute.itemSize * componentSize;
        if (target === WEBGL_CONSTANTS.ARRAY_BUFFER) {
            byteStride = Math.ceil(byteStride / 4) * 4;
        }
        const byteLength = getPaddedBufferSize(count * byteStride);
        const dataView = new DataView(new ArrayBuffer(byteLength));
        let offset = 0;
        for (let i = start; i < start + count; i++) {
            for (let a = 0; a < attribute.itemSize; a++) {
                let value;
                if (attribute.itemSize > 4) {
                    value = attribute.array[i * attribute.itemSize + a];
                }
                else {
                    if (a === 0)
                        value = attribute.getX(i);
                    else if (a === 1)
                        value = attribute.getY(i);
                    else if (a === 2)
                        value = attribute.getZ(i);
                    else if (a === 3)
                        value = attribute.getW(i);
                    if (attribute.normalized === true) {
                        value = MathUtils.normalize(value, attribute.array);
                    }
                }
                if (componentType === WEBGL_CONSTANTS.FLOAT) {
                    dataView.setFloat32(offset, value, true);
                }
                else if (componentType === WEBGL_CONSTANTS.INT) {
                    dataView.setInt32(offset, value, true);
                }
                else if (componentType === WEBGL_CONSTANTS.UNSIGNED_INT) {
                    dataView.setUint32(offset, value, true);
                }
                else if (componentType === WEBGL_CONSTANTS.SHORT) {
                    dataView.setInt16(offset, value, true);
                }
                else if (componentType === WEBGL_CONSTANTS.UNSIGNED_SHORT) {
                    dataView.setUint16(offset, value, true);
                }
                else if (componentType === WEBGL_CONSTANTS.BYTE) {
                    dataView.setInt8(offset, value);
                }
                else if (componentType === WEBGL_CONSTANTS.UNSIGNED_BYTE) {
                    dataView.setUint8(offset, value);
                }
                offset += componentSize;
            }
            if ((offset % byteStride) !== 0) {
                offset += byteStride - (offset % byteStride);
            }
        }
        const bufferViewDef = {
            buffer: this.processBuffer(dataView.buffer),
            byteOffset: this.byteOffset,
            byteLength: byteLength
        };
        if (target !== undefined)
            bufferViewDef.target = target;
        if (target === WEBGL_CONSTANTS.ARRAY_BUFFER) {
            bufferViewDef.byteStride = byteStride;
        }
        this.byteOffset += byteLength;
        json.bufferViews.push(bufferViewDef);
        const output = {
            id: json.bufferViews.length - 1,
            byteLength: 0
        };
        return output;
    }
    processBufferViewImage(imgBuffer) {
        const writer = this;
        const json = writer.json;
        if (!json.bufferViews)
            json.bufferViews = [];
        const buffer = getPaddedArrayBuffer(imgBuffer.buffer);
        const bufferViewDef = {
            buffer: writer.processBuffer(buffer),
            byteOffset: writer.byteOffset,
            byteLength: buffer.byteLength
        };
        writer.byteOffset += buffer.byteLength;
        return json.bufferViews.push(bufferViewDef) - 1;
    }
    processAccessor(attribute, geometry, start, count) {
        const json = this.json;
        const types = {
            1: 'SCALAR',
            2: 'VEC2',
            3: 'VEC3',
            4: 'VEC4',
            9: 'MAT3',
            16: 'MAT4'
        };
        let componentType;
        if (attribute.array.constructor === Float32Array) {
            componentType = WEBGL_CONSTANTS.FLOAT;
        }
        else if (attribute.array.constructor === Int32Array) {
            componentType = WEBGL_CONSTANTS.INT;
        }
        else if (attribute.array.constructor === Uint32Array) {
            componentType = WEBGL_CONSTANTS.UNSIGNED_INT;
        }
        else if (attribute.array.constructor === Int16Array) {
            componentType = WEBGL_CONSTANTS.SHORT;
        }
        else if (attribute.array.constructor === Uint16Array) {
            componentType = WEBGL_CONSTANTS.UNSIGNED_SHORT;
        }
        else if (attribute.array.constructor === Int8Array) {
            componentType = WEBGL_CONSTANTS.BYTE;
        }
        else if (attribute.array.constructor === Uint8Array) {
            componentType = WEBGL_CONSTANTS.UNSIGNED_BYTE;
        }
        else {
            throw new Error('THREE.GLTFExporter: Unsupported bufferAttribute component type: ' + attribute.array.constructor.name);
        }
        if (start === undefined)
            start = 0;
        if (count === undefined || count === Infinity)
            count = attribute.count;
        if (count === 0)
            return null;
        const minMax = getMinMax(attribute, start, count);
        let bufferViewTarget;
        if (geometry !== undefined) {
            bufferViewTarget = attribute === geometry.index ? WEBGL_CONSTANTS.ELEMENT_ARRAY_BUFFER : WEBGL_CONSTANTS.ARRAY_BUFFER;
        }
        const bufferView = this.processBufferView(attribute, componentType, start, count, bufferViewTarget);
        const accessorDef = {
            bufferView: bufferView.id,
            byteOffset: bufferView.byteOffset,
            componentType: componentType,
            count: count,
            max: minMax.max,
            min: minMax.min,
            type: types[attribute.itemSize]
        };
        if (attribute.normalized === true)
            accessorDef.normalized = true;
        if (!json.accessors)
            json.accessors = [];
        return json.accessors.push(accessorDef) - 1;
    }
    processImage(image, format, flipY, mimeType = 'image/png') {
        if (image !== null) {
            const writer = this;
            const cache = writer.cache;
            const json = writer.json;
            const options = writer.options;
            const pending = writer.pending;
            if (!cache.images.has(image))
                cache.images.set(image, {});
            const cachedImages = cache.images.get(image);
            const key = mimeType + ':flipY/' + flipY.toString();
            if (cachedImages[key] !== undefined)
                return cachedImages[key];
            if (!json.images)
                json.images = [];
            const imageDef = { mimeType: mimeType };
            let imgSharp;
            if (image.data !== undefined) {
                if (format !== RGBAFormat) {
                    console.error('GLTFExporter: Only RGBAFormat is supported.', format);
                }
                if (image.width > options.maxTextureSize || image.height > options.maxTextureSize) {
                    console.warn('GLTFExporter: Image size is bigger than maxTextureSize', image);
                }
                imgSharp = sharp(image.data, {
                    raw: {
                        width: Math.min(image.width, options.maxTextureSize),
                        height: Math.min(image.height, options.maxTextureSize),
                        channels: image.channels,
                    },
                })
                    .flip(flipY === true)
                    .toFormat(mimeType.split('/').pop());
            }
            else {
                throw new Error('THREE.GLTFExporter: Invalid image type.');
            }
            if (options.binary === true) {
                pending.push(imgSharp.toBuffer().then((buffer) => {
                    imageDef.bufferView = writer.processBufferViewImage(buffer);
                }));
            }
            else {
                pending.push(imgSharp.toBuffer().then((buffer) => {
                    imageDef.uri = 'data:' + mimeType + ';base64,' + buffer.toString('base64');
                }));
            }
            const index = json.images.push(imageDef) - 1;
            cachedImages[key] = index;
            return index;
        }
        else {
            throw new Error('THREE.GLTFExporter: No valid image data found. Unable to process texture.');
        }
    }
    processSampler(map) {
        const json = this.json;
        if (!json.samplers)
            json.samplers = [];
        const samplerDef = {
            magFilter: THREE_TO_WEBGL[map.magFilter],
            minFilter: THREE_TO_WEBGL[map.minFilter],
            wrapS: THREE_TO_WEBGL[map.wrapS],
            wrapT: THREE_TO_WEBGL[map.wrapT]
        };
        return json.samplers.push(samplerDef) - 1;
    }
    processTexture(map) {
        const writer = this;
        const options = writer.options;
        const cache = this.cache;
        const json = this.json;
        if (cache.textures.has(map))
            return cache.textures.get(map);
        if (!json.textures)
            json.textures = [];
        if (map instanceof CompressedTexture) {
            map = decompress(map, options.maxTextureSize);
        }
        let mimeType = map.userData.mimeType;
        if (mimeType === 'image/webp')
            mimeType = 'image/png';
        const textureDef = {
            sampler: this.processSampler(map),
            source: this.processImage(map.image, map.format, map.flipY, mimeType)
        };
        if (map.name)
            textureDef.name = map.name;
        this._invokeAll(function (ext) {
            ext.writeTexture && ext.writeTexture(map, textureDef);
        });
        const index = json.textures.push(textureDef) - 1;
        cache.textures.set(map, index);
        return index;
    }
    processMaterial(material) {
        const cache = this.cache;
        const json = this.json;
        if (cache.materials.has(material))
            return cache.materials.get(material);
        if (material.isShaderMaterial) {
            console.warn('GLTFExporter: THREE.ShaderMaterial not supported.');
            return null;
        }
        if (!json.materials)
            json.materials = [];
        const materialDef = { pbrMetallicRoughness: {} };
        if (material.isMeshStandardMaterial !== true && material.isMeshBasicMaterial !== true) {
            console.warn('GLTFExporter: Use MeshStandardMaterial or MeshBasicMaterial for best results.');
        }
        const color = material.color.toArray().concat([material.opacity]);
        if (!equalArray(color, [1, 1, 1, 1])) {
            materialDef.pbrMetallicRoughness.baseColorFactor = color;
        }
        if (material.isMeshStandardMaterial) {
            materialDef.pbrMetallicRoughness.metallicFactor = material.metalness;
            materialDef.pbrMetallicRoughness.roughnessFactor = material.roughness;
        }
        else {
            materialDef.pbrMetallicRoughness.metallicFactor = 0.5;
            materialDef.pbrMetallicRoughness.roughnessFactor = 0.5;
        }
        if (material.metalnessMap || material.roughnessMap) {
            const metalRoughTexture = this.buildMetalRoughTexture(material.metalnessMap, material.roughnessMap);
            const metalRoughMapDef = {
                index: this.processTexture(metalRoughTexture),
                channel: metalRoughTexture.channel
            };
            this.applyTextureTransform(metalRoughMapDef, metalRoughTexture);
            materialDef.pbrMetallicRoughness.metallicRoughnessTexture = metalRoughMapDef;
        }
        if (material.map) {
            const baseColorMapDef = {
                index: this.processTexture(material.map),
                texCoord: material.map.channel
            };
            this.applyTextureTransform(baseColorMapDef, material.map);
            materialDef.pbrMetallicRoughness.baseColorTexture = baseColorMapDef;
        }
        if (material.emissive) {
            const emissive = material.emissive;
            const maxEmissiveComponent = Math.max(emissive.r, emissive.g, emissive.b);
            if (maxEmissiveComponent > 0) {
                materialDef.emissiveFactor = material.emissive.toArray();
            }
            if (material.emissiveMap) {
                const emissiveMapDef = {
                    index: this.processTexture(material.emissiveMap),
                    texCoord: material.emissiveMap.channel
                };
                this.applyTextureTransform(emissiveMapDef, material.emissiveMap);
                materialDef.emissiveTexture = emissiveMapDef;
            }
        }
        if (material.normalMap) {
            const normalMapDef = {
                index: this.processTexture(material.normalMap),
                texCoord: material.normalMap.channel
            };
            if (material.normalScale && material.normalScale.x !== 1) {
                normalMapDef.scale = material.normalScale.x;
            }
            this.applyTextureTransform(normalMapDef, material.normalMap);
            materialDef.normalTexture = normalMapDef;
        }
        if (material.aoMap) {
            const occlusionMapDef = {
                index: this.processTexture(material.aoMap),
                texCoord: material.aoMap.channel
            };
            if (material.aoMapIntensity !== 1.0) {
                occlusionMapDef.strength = material.aoMapIntensity;
            }
            this.applyTextureTransform(occlusionMapDef, material.aoMap);
            materialDef.occlusionTexture = occlusionMapDef;
        }
        if (material.transparent) {
            materialDef.alphaMode = 'BLEND';
        }
        else {
            if (material.alphaTest > 0.0) {
                materialDef.alphaMode = 'MASK';
                materialDef.alphaCutoff = material.alphaTest;
            }
        }
        if (material.side === DoubleSide)
            materialDef.doubleSided = true;
        if (material.name !== '')
            materialDef.name = material.name;
        this.serializeUserData(material, materialDef);
        this._invokeAll(function (ext) {
            ext.writeMaterial && ext.writeMaterial(material, materialDef);
        });
        const index = json.materials.push(materialDef) - 1;
        cache.materials.set(material, index);
        return index;
    }
    processMesh(mesh) {
        const cache = this.cache;
        const json = this.json;
        const meshCacheKeyParts = [mesh.geometry.uuid];
        if (Array.isArray(mesh.material)) {
            for (let i = 0, l = mesh.material.length; i < l; i++) {
                meshCacheKeyParts.push(mesh.material[i].uuid);
            }
        }
        else {
            meshCacheKeyParts.push(mesh.material.uuid);
        }
        const meshCacheKey = meshCacheKeyParts.join(':');
        if (cache.meshes.has(meshCacheKey))
            return cache.meshes.get(meshCacheKey);
        const geometry = mesh.geometry;
        let mode;
        if (mesh.isLineSegments) {
            mode = WEBGL_CONSTANTS.LINES;
        }
        else if (mesh.isLineLoop) {
            mode = WEBGL_CONSTANTS.LINE_LOOP;
        }
        else if (mesh.isLine) {
            mode = WEBGL_CONSTANTS.LINE_STRIP;
        }
        else if (mesh.isPoints) {
            mode = WEBGL_CONSTANTS.POINTS;
        }
        else {
            mode = mesh.material.wireframe ? WEBGL_CONSTANTS.LINES : WEBGL_CONSTANTS.TRIANGLES;
        }
        const meshDef = {};
        const attributes = {};
        const primitives = [];
        const targets = [];
        const nameConversion = {
            uv: 'TEXCOORD_0',
            uv1: 'TEXCOORD_1',
            uv2: 'TEXCOORD_2',
            uv3: 'TEXCOORD_3',
            color: 'COLOR_0',
            skinWeight: 'WEIGHTS_0',
            skinIndex: 'JOINTS_0'
        };
        const originalNormal = geometry.getAttribute('normal');
        if (originalNormal !== undefined && !this.isNormalizedNormalAttribute(originalNormal)) {
            console.warn('THREE.GLTFExporter: Creating normalized normal attribute from the non-normalized one.');
            geometry.setAttribute('normal', this.createNormalizedNormalAttribute(originalNormal));
        }
        let modifiedAttribute = null;
        for (let attributeName in geometry.attributes) {
            if (attributeName.slice(0, 5) === 'morph')
                continue;
            const attribute = geometry.attributes[attributeName];
            attributeName = nameConversion[attributeName] || attributeName.toUpperCase();
            const validVertexAttributes = /^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+)$/;
            if (!validVertexAttributes.test(attributeName))
                attributeName = '_' + attributeName;
            if (cache.attributes.has(this.getUID(attribute))) {
                attributes[attributeName] = cache.attributes.get(this.getUID(attribute));
                continue;
            }
            modifiedAttribute = null;
            const array = attribute.array;
            if (attributeName === 'JOINTS_0' &&
                !(array instanceof Uint16Array) &&
                !(array instanceof Uint8Array)) {
                console.warn('GLTFExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.');
                modifiedAttribute = new BufferAttribute(new Uint16Array(array), attribute.itemSize, attribute.normalized);
            }
            const accessor = this.processAccessor(modifiedAttribute || attribute, geometry);
            if (accessor !== null) {
                if (!attributeName.startsWith('_')) {
                    this.detectMeshQuantization(attributeName, attribute);
                }
                attributes[attributeName] = accessor;
                cache.attributes.set(this.getUID(attribute), accessor);
            }
        }
        if (originalNormal !== undefined)
            geometry.setAttribute('normal', originalNormal);
        if (Object.keys(attributes).length === 0)
            return null;
        if (mesh.morphTargetInfluences !== undefined && mesh.morphTargetInfluences.length > 0) {
            const weights = [];
            const targetNames = [];
            const reverseDictionary = {};
            if (mesh.morphTargetDictionary !== undefined) {
                for (const key in mesh.morphTargetDictionary) {
                    reverseDictionary[mesh.morphTargetDictionary[key]] = key;
                }
            }
            for (let i = 0; i < mesh.morphTargetInfluences.length; ++i) {
                const target = {};
                let warned = false;
                for (const attributeName in geometry.morphAttributes) {
                    if (attributeName !== 'position' && attributeName !== 'normal') {
                        if (!warned) {
                            console.warn('GLTFExporter: Only POSITION and NORMAL morph are supported.');
                            warned = true;
                        }
                        continue;
                    }
                    const attribute = geometry.morphAttributes[attributeName][i];
                    const gltfAttributeName = attributeName.toUpperCase();
                    const baseAttribute = geometry.attributes[attributeName];
                    if (cache.attributes.has(this.getUID(attribute, true))) {
                        target[gltfAttributeName] = cache.attributes.get(this.getUID(attribute, true));
                        continue;
                    }
                    const relativeAttribute = attribute.clone();
                    if (!geometry.morphTargetsRelative) {
                        for (let j = 0, jl = attribute.count; j < jl; j++) {
                            for (let a = 0; a < attribute.itemSize; a++) {
                                if (a === 0)
                                    relativeAttribute.setX(j, attribute.getX(j) - baseAttribute.getX(j));
                                if (a === 1)
                                    relativeAttribute.setY(j, attribute.getY(j) - baseAttribute.getY(j));
                                if (a === 2)
                                    relativeAttribute.setZ(j, attribute.getZ(j) - baseAttribute.getZ(j));
                                if (a === 3)
                                    relativeAttribute.setW(j, attribute.getW(j) - baseAttribute.getW(j));
                            }
                        }
                    }
                    target[gltfAttributeName] = this.processAccessor(relativeAttribute, geometry);
                    cache.attributes.set(this.getUID(baseAttribute, true), target[gltfAttributeName]);
                }
                targets.push(target);
                weights.push(mesh.morphTargetInfluences[i]);
                if (mesh.morphTargetDictionary !== undefined)
                    targetNames.push(reverseDictionary[i]);
            }
            meshDef.weights = weights;
            if (targetNames.length > 0) {
                meshDef.extras = {};
                meshDef.extras.targetNames = targetNames;
            }
        }
        const isMultiMaterial = Array.isArray(mesh.material);
        if (isMultiMaterial && geometry.groups.length === 0)
            return null;
        let didForceIndices = false;
        if (isMultiMaterial && geometry.index === null) {
            const indices = [];
            for (let i = 0, il = geometry.attributes.position.count; i < il; i++) {
                indices[i] = i;
            }
            geometry.setIndex(indices);
            didForceIndices = true;
        }
        const materials = isMultiMaterial ? mesh.material : [mesh.material];
        const groups = isMultiMaterial ? geometry.groups : [{ materialIndex: 0, start: undefined, count: undefined }];
        for (let i = 0, il = groups.length; i < il; i++) {
            const primitive = {
                mode: mode,
                attributes: attributes,
            };
            this.serializeUserData(geometry, primitive);
            if (targets.length > 0)
                primitive.targets = targets;
            if (geometry.index !== null) {
                let cacheKey = this.getUID(geometry.index);
                if (groups[i].start !== undefined || groups[i].count !== undefined) {
                    cacheKey += ':' + groups[i].start + ':' + groups[i].count;
                }
                if (cache.attributes.has(cacheKey)) {
                    primitive.indices = cache.attributes.get(cacheKey);
                }
                else {
                    primitive.indices = this.processAccessor(geometry.index, geometry, groups[i].start, groups[i].count);
                    cache.attributes.set(cacheKey, primitive.indices);
                }
                if (primitive.indices === null)
                    delete primitive.indices;
            }
            const material = this.processMaterial(materials[groups[i].materialIndex]);
            if (material !== null)
                primitive.material = material;
            primitives.push(primitive);
        }
        if (didForceIndices === true) {
            geometry.setIndex(null);
        }
        meshDef.primitives = primitives;
        if (!json.meshes)
            json.meshes = [];
        this._invokeAll(function (ext) {
            ext.writeMesh && ext.writeMesh(mesh, meshDef);
        });
        const index = json.meshes.push(meshDef) - 1;
        cache.meshes.set(meshCacheKey, index);
        return index;
    }
    detectMeshQuantization(attributeName, attribute) {
        if (this.extensionsUsed[KHR_MESH_QUANTIZATION])
            return;
        let attrType = undefined;
        switch (attribute.array.constructor) {
            case Int8Array:
                attrType = 'byte';
                break;
            case Uint8Array:
                attrType = 'unsigned byte';
                break;
            case Int16Array:
                attrType = 'short';
                break;
            case Uint16Array:
                attrType = 'unsigned short';
                break;
            default:
                return;
        }
        if (attribute.normalized)
            attrType += ' normalized';
        const attrNamePrefix = attributeName.split('_', 1)[0];
        if (KHR_mesh_quantization_ExtraAttrTypes[attrNamePrefix] && KHR_mesh_quantization_ExtraAttrTypes[attrNamePrefix].includes(attrType)) {
            this.extensionsUsed[KHR_MESH_QUANTIZATION] = true;
            this.extensionsRequired[KHR_MESH_QUANTIZATION] = true;
        }
    }
    processCamera(camera) {
        const json = this.json;
        if (!json.cameras)
            json.cameras = [];
        const isOrtho = camera.isOrthographicCamera;
        const cameraDef = {
            type: isOrtho ? 'orthographic' : 'perspective'
        };
        if (isOrtho) {
            cameraDef.orthographic = {
                xmag: camera.right * 2,
                ymag: camera.top * 2,
                zfar: camera.far <= 0 ? 0.001 : camera.far,
                znear: camera.near < 0 ? 0 : camera.near
            };
        }
        else {
            cameraDef.perspective = {
                aspectRatio: camera.aspect,
                yfov: MathUtils.degToRad(camera.fov),
                zfar: camera.far <= 0 ? 0.001 : camera.far,
                znear: camera.near < 0 ? 0 : camera.near
            };
        }
        if (camera.name !== '')
            cameraDef.name = camera.type;
        return json.cameras.push(cameraDef) - 1;
    }
    processAnimation(clip, root) {
        const json = this.json;
        const nodeMap = this.nodeMap;
        if (!json.animations)
            json.animations = [];
        clip = GLTFExporter.Utils.mergeMorphTargetTracks(clip.clone(), root);
        const tracks = clip.tracks;
        const channels = [];
        const samplers = [];
        for (let i = 0; i < tracks.length; ++i) {
            const track = tracks[i];
            const trackBinding = PropertyBinding.parseTrackName(track.name);
            let trackNode = PropertyBinding.findNode(root, trackBinding.nodeName);
            const trackProperty = PATH_PROPERTIES[trackBinding.propertyName];
            if (trackBinding.objectName === 'bones') {
                if (trackNode.isSkinnedMesh === true) {
                    trackNode = trackNode.skeleton.getBoneByName(trackBinding.objectIndex);
                }
                else {
                    trackNode = undefined;
                }
            }
            if (!trackNode || !trackProperty) {
                console.warn('THREE.GLTFExporter: Could not export animation track "%s".', track.name);
                return null;
            }
            const inputItemSize = 1;
            let outputItemSize = track.values.length / track.times.length;
            if (trackProperty === PATH_PROPERTIES.morphTargetInfluences) {
                outputItemSize /= trackNode.morphTargetInfluences.length;
            }
            let interpolation;
            if (track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline === true) {
                interpolation = 'CUBICSPLINE';
                outputItemSize /= 3;
            }
            else if (track.getInterpolation() === InterpolateDiscrete) {
                interpolation = 'STEP';
            }
            else {
                interpolation = 'LINEAR';
            }
            samplers.push({
                input: this.processAccessor(new BufferAttribute(track.times, inputItemSize)),
                output: this.processAccessor(new BufferAttribute(track.values, outputItemSize)),
                interpolation: interpolation
            });
            channels.push({
                sampler: samplers.length - 1,
                target: {
                    node: nodeMap.get(trackNode),
                    path: trackProperty
                }
            });
        }
        json.animations.push({
            name: clip.name || 'clip_' + json.animations.length,
            samplers: samplers,
            channels: channels
        });
        return json.animations.length - 1;
    }
    processSkin(object) {
        const json = this.json;
        const nodeMap = this.nodeMap;
        const node = json.nodes[nodeMap.get(object)];
        const skeleton = object.skeleton;
        if (skeleton === undefined)
            return null;
        const rootJoint = object.skeleton.bones[0];
        if (rootJoint === undefined)
            return null;
        const joints = [];
        const inverseBindMatrices = new Float32Array(skeleton.bones.length * 16);
        const temporaryBoneInverse = new Matrix4();
        for (let i = 0; i < skeleton.bones.length; ++i) {
            joints.push(nodeMap.get(skeleton.bones[i]));
            temporaryBoneInverse.copy(skeleton.boneInverses[i]);
            temporaryBoneInverse.multiply(object.bindMatrix).toArray(inverseBindMatrices, i * 16);
        }
        if (json.skins === undefined)
            json.skins = [];
        json.skins.push({
            inverseBindMatrices: this.processAccessor(new BufferAttribute(inverseBindMatrices, 16)),
            joints: joints,
            skeleton: nodeMap.get(rootJoint)
        });
        const skinIndex = node.skin = json.skins.length - 1;
        return skinIndex;
    }
    processNode(object) {
        const json = this.json;
        const options = this.options;
        const nodeMap = this.nodeMap;
        if (!json.nodes)
            json.nodes = [];
        const nodeDef = {};
        if (options.trs) {
            const rotation = object.quaternion.toArray();
            const position = object.position.toArray();
            const scale = object.scale.toArray();
            if (!equalArray(rotation, [0, 0, 0, 1])) {
                nodeDef.rotation = rotation;
            }
            if (!equalArray(position, [0, 0, 0])) {
                nodeDef.translation = position;
            }
            if (!equalArray(scale, [1, 1, 1])) {
                nodeDef.scale = scale;
            }
        }
        else {
            if (object.matrixAutoUpdate) {
                object.updateMatrix();
            }
            if (isIdentityMatrix(object.matrix) === false) {
                nodeDef.matrix = object.matrix.elements;
            }
        }
        if (object.name !== '')
            nodeDef.name = String(object.name);
        this.serializeUserData(object, nodeDef);
        if (object.isMesh || object.isLine || object.isPoints) {
            const meshIndex = this.processMesh(object);
            if (meshIndex !== null)
                nodeDef.mesh = meshIndex;
        }
        else if (object.isCamera) {
            nodeDef.camera = this.processCamera(object);
        }
        if (object.isSkinnedMesh)
            this.skins.push(object);
        if (object.children.length > 0) {
            const children = [];
            for (let i = 0, l = object.children.length; i < l; i++) {
                const child = object.children[i];
                if (child.visible || options.onlyVisible === false) {
                    const nodeIndex = this.processNode(child);
                    if (nodeIndex !== null)
                        children.push(nodeIndex);
                }
            }
            if (children.length > 0)
                nodeDef.children = children;
        }
        this._invokeAll(function (ext) {
            ext.writeNode && ext.writeNode(object, nodeDef);
        });
        const nodeIndex = json.nodes.push(nodeDef) - 1;
        nodeMap.set(object, nodeIndex);
        return nodeIndex;
    }
    processScene(scene) {
        const json = this.json;
        const options = this.options;
        if (!json.scenes) {
            json.scenes = [];
            json.scene = 0;
        }
        const sceneDef = {};
        if (scene.name !== '')
            sceneDef.name = scene.name;
        json.scenes.push(sceneDef);
        const nodes = [];
        for (let i = 0, l = scene.children.length; i < l; i++) {
            const child = scene.children[i];
            if (child.visible || options.onlyVisible === false) {
                const nodeIndex = this.processNode(child);
                if (nodeIndex !== null)
                    nodes.push(nodeIndex);
            }
        }
        if (nodes.length > 0)
            sceneDef.nodes = nodes;
        this.serializeUserData(scene, sceneDef);
    }
    processObjects(objects) {
        const scene = new Scene();
        scene.name = 'AuxScene';
        for (let i = 0; i < objects.length; i++) {
            scene.children.push(objects[i]);
        }
        this.processScene(scene);
    }
    processInput(input) {
        const options = this.options;
        input = input instanceof Array ? input : [input];
        this._invokeAll(function (ext) {
            ext.beforeParse && ext.beforeParse(input);
        });
        const objectsWithoutScene = [];
        for (let i = 0; i < input.length; i++) {
            if (input[i] instanceof Scene) {
                this.processScene(input[i]);
            }
            else {
                objectsWithoutScene.push(input[i]);
            }
        }
        if (objectsWithoutScene.length > 0)
            this.processObjects(objectsWithoutScene);
        for (let i = 0; i < this.skins.length; ++i) {
            this.processSkin(this.skins[i]);
        }
        for (let i = 0; i < options.animations.length; ++i) {
            this.processAnimation(options.animations[i], input[0]);
        }
        this._invokeAll(function (ext) {
            ext.afterParse && ext.afterParse(input);
        });
    }
    _invokeAll(func) {
        for (let i = 0, il = this.plugins.length; i < il; i++) {
            func(this.plugins[i]);
        }
    }
}
class GLTFLightExtension {
    constructor(writer) {
        this.name = 'KHR_lights_punctual';
        this.writer = writer;
    }
    writeNode(light, nodeDef) {
        if (!light.isLight)
            return;
        if (!light.isDirectionalLight && !light.isPointLight && !light.isSpotLight) {
            console.warn('THREE.GLTFExporter: Only directional, point, and spot lights are supported.', light);
            return;
        }
        const writer = this.writer;
        const json = writer.json;
        const extensionsUsed = writer.extensionsUsed;
        const lightDef = {};
        if (light.name)
            lightDef.name = light.name;
        lightDef.color = light.color.toArray();
        lightDef.intensity = light.intensity;
        if (light.isDirectionalLight) {
            lightDef.type = 'directional';
        }
        else if (light.isPointLight) {
            lightDef.type = 'point';
            if (light.distance > 0)
                lightDef.range = light.distance;
        }
        else if (light.isSpotLight) {
            lightDef.type = 'spot';
            if (light.distance > 0)
                lightDef.range = light.distance;
            lightDef.spot = {};
            lightDef.spot.innerConeAngle = (1.0 - light.penumbra) * light.angle;
            lightDef.spot.outerConeAngle = light.angle;
        }
        if (light.decay !== undefined && light.decay !== 2) {
            console.warn('THREE.GLTFExporter: Light decay may be lost. glTF is physically-based, '
                + 'and expects light.decay=2.');
        }
        if (light.target
            && (light.target.parent !== light
                || light.target.position.x !== 0
                || light.target.position.y !== 0
                || light.target.position.z !== -1)) {
            console.warn('THREE.GLTFExporter: Light direction may be lost. For best results, '
                + 'make light.target a child of the light with position 0,0,-1.');
        }
        if (!extensionsUsed[this.name]) {
            json.extensions = json.extensions || {};
            json.extensions[this.name] = { lights: [] };
            extensionsUsed[this.name] = true;
        }
        const lights = json.extensions[this.name].lights;
        lights.push(lightDef);
        nodeDef.extensions = nodeDef.extensions || {};
        nodeDef.extensions[this.name] = { light: lights.length - 1 };
    }
}
class GLTFMaterialsUnlitExtension {
    constructor(writer) {
        this.name = 'KHR_materials_unlit';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshBasicMaterial)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = {};
        extensionsUsed[this.name] = true;
        materialDef.pbrMetallicRoughness.metallicFactor = 0.0;
        materialDef.pbrMetallicRoughness.roughnessFactor = 0.9;
    }
}
class GLTFMaterialsClearcoatExtension {
    constructor(writer) {
        this.name = 'KHR_materials_clearcoat';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshPhysicalMaterial || material.clearcoat === 0)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        extensionDef.clearcoatFactor = material.clearcoat;
        if (material.clearcoatMap) {
            const clearcoatMapDef = {
                index: writer.processTexture(material.clearcoatMap),
                texCoord: material.clearcoatMap.channel
            };
            writer.applyTextureTransform(clearcoatMapDef, material.clearcoatMap);
            extensionDef.clearcoatTexture = clearcoatMapDef;
        }
        extensionDef.clearcoatRoughnessFactor = material.clearcoatRoughness;
        if (material.clearcoatRoughnessMap) {
            const clearcoatRoughnessMapDef = {
                index: writer.processTexture(material.clearcoatRoughnessMap),
                texCoord: material.clearcoatRoughnessMap.channel
            };
            writer.applyTextureTransform(clearcoatRoughnessMapDef, material.clearcoatRoughnessMap);
            extensionDef.clearcoatRoughnessTexture = clearcoatRoughnessMapDef;
        }
        if (material.clearcoatNormalMap) {
            const clearcoatNormalMapDef = {
                index: writer.processTexture(material.clearcoatNormalMap),
                texCoord: material.clearcoatNormalMap.channel
            };
            if (material.clearcoatNormalScale.x !== 1)
                clearcoatNormalMapDef.scale = material.clearcoatNormalScale.x;
            writer.applyTextureTransform(clearcoatNormalMapDef, material.clearcoatNormalMap);
            extensionDef.clearcoatNormalTexture = clearcoatNormalMapDef;
        }
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsDispersionExtension {
    constructor(writer) {
        this.name = 'KHR_materials_dispersion';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshPhysicalMaterial || material.dispersion === 0)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        extensionDef.dispersion = material.dispersion;
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsIridescenceExtension {
    constructor(writer) {
        this.name = 'KHR_materials_iridescence';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshPhysicalMaterial || material.iridescence === 0)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        extensionDef.iridescenceFactor = material.iridescence;
        if (material.iridescenceMap) {
            const iridescenceMapDef = {
                index: writer.processTexture(material.iridescenceMap),
                texCoord: material.iridescenceMap.channel
            };
            writer.applyTextureTransform(iridescenceMapDef, material.iridescenceMap);
            extensionDef.iridescenceTexture = iridescenceMapDef;
        }
        extensionDef.iridescenceIor = material.iridescenceIOR;
        extensionDef.iridescenceThicknessMinimum = material.iridescenceThicknessRange[0];
        extensionDef.iridescenceThicknessMaximum = material.iridescenceThicknessRange[1];
        if (material.iridescenceThicknessMap) {
            const iridescenceThicknessMapDef = {
                index: writer.processTexture(material.iridescenceThicknessMap),
                texCoord: material.iridescenceThicknessMap.channel
            };
            writer.applyTextureTransform(iridescenceThicknessMapDef, material.iridescenceThicknessMap);
            extensionDef.iridescenceThicknessTexture = iridescenceThicknessMapDef;
        }
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsTransmissionExtension {
    constructor(writer) {
        this.name = 'KHR_materials_transmission';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshPhysicalMaterial || material.transmission === 0)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        extensionDef.transmissionFactor = material.transmission;
        if (material.transmissionMap) {
            const transmissionMapDef = {
                index: writer.processTexture(material.transmissionMap),
                texCoord: material.transmissionMap.channel
            };
            writer.applyTextureTransform(transmissionMapDef, material.transmissionMap);
            extensionDef.transmissionTexture = transmissionMapDef;
        }
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsVolumeExtension {
    constructor(writer) {
        this.name = 'KHR_materials_volume';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshPhysicalMaterial || material.transmission === 0)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        extensionDef.thicknessFactor = material.thickness;
        if (material.thicknessMap) {
            const thicknessMapDef = {
                index: writer.processTexture(material.thicknessMap),
                texCoord: material.thicknessMap.channel
            };
            writer.applyTextureTransform(thicknessMapDef, material.thicknessMap);
            extensionDef.thicknessTexture = thicknessMapDef;
        }
        extensionDef.attenuationDistance = material.attenuationDistance;
        extensionDef.attenuationColor = material.attenuationColor.toArray();
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsIorExtension {
    constructor(writer) {
        this.name = 'KHR_materials_ior';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshPhysicalMaterial || material.ior === 1.5)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        extensionDef.ior = material.ior;
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsSpecularExtension {
    constructor(writer) {
        this.name = 'KHR_materials_specular';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshPhysicalMaterial || (material.specularIntensity === 1.0 &&
            material.specularColor.equals(DEFAULT_SPECULAR_COLOR) &&
            !material.specularIntensityMap && !material.specularColorMap))
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        if (material.specularIntensityMap) {
            const specularIntensityMapDef = {
                index: writer.processTexture(material.specularIntensityMap),
                texCoord: material.specularIntensityMap.channel
            };
            writer.applyTextureTransform(specularIntensityMapDef, material.specularIntensityMap);
            extensionDef.specularTexture = specularIntensityMapDef;
        }
        if (material.specularColorMap) {
            const specularColorMapDef = {
                index: writer.processTexture(material.specularColorMap),
                texCoord: material.specularColorMap.channel
            };
            writer.applyTextureTransform(specularColorMapDef, material.specularColorMap);
            extensionDef.specularColorTexture = specularColorMapDef;
        }
        extensionDef.specularFactor = material.specularIntensity;
        extensionDef.specularColorFactor = material.specularColor.toArray();
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsSheenExtension {
    constructor(writer) {
        this.name = 'KHR_materials_sheen';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshPhysicalMaterial || material.sheen == 0.0)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        if (material.sheenRoughnessMap) {
            const sheenRoughnessMapDef = {
                index: writer.processTexture(material.sheenRoughnessMap),
                texCoord: material.sheenRoughnessMap.channel
            };
            writer.applyTextureTransform(sheenRoughnessMapDef, material.sheenRoughnessMap);
            extensionDef.sheenRoughnessTexture = sheenRoughnessMapDef;
        }
        if (material.sheenColorMap) {
            const sheenColorMapDef = {
                index: writer.processTexture(material.sheenColorMap),
                texCoord: material.sheenColorMap.channel
            };
            writer.applyTextureTransform(sheenColorMapDef, material.sheenColorMap);
            extensionDef.sheenColorTexture = sheenColorMapDef;
        }
        extensionDef.sheenRoughnessFactor = material.sheenRoughness;
        extensionDef.sheenColorFactor = material.sheenColor.toArray();
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsAnisotropyExtension {
    constructor(writer) {
        this.name = 'KHR_materials_anisotropy';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshPhysicalMaterial || material.anisotropy == 0.0)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        if (material.anisotropyMap) {
            const anisotropyMapDef = { index: writer.processTexture(material.anisotropyMap) };
            writer.applyTextureTransform(anisotropyMapDef, material.anisotropyMap);
            extensionDef.anisotropyTexture = anisotropyMapDef;
        }
        extensionDef.anisotropyStrength = material.anisotropy;
        extensionDef.anisotropyRotation = material.anisotropyRotation;
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsEmissiveStrengthExtension {
    constructor(writer) {
        this.name = 'KHR_materials_emissive_strength';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshStandardMaterial || material.emissiveIntensity === 1.0)
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        extensionDef.emissiveStrength = material.emissiveIntensity;
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMaterialsBumpExtension {
    constructor(writer) {
        this.name = 'EXT_materials_bump';
        this.writer = writer;
    }
    writeMaterial(material, materialDef) {
        if (!material.isMeshStandardMaterial || (material.bumpScale === 1 &&
            !material.bumpMap))
            return;
        const writer = this.writer;
        const extensionsUsed = writer.extensionsUsed;
        const extensionDef = {};
        if (material.bumpMap) {
            const bumpMapDef = {
                index: writer.processTexture(material.bumpMap),
                texCoord: material.bumpMap.channel
            };
            writer.applyTextureTransform(bumpMapDef, material.bumpMap);
            extensionDef.bumpTexture = bumpMapDef;
        }
        extensionDef.bumpFactor = material.bumpScale;
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[this.name] = extensionDef;
        extensionsUsed[this.name] = true;
    }
}
class GLTFMeshGpuInstancing {
    constructor(writer) {
        this.name = 'EXT_mesh_gpu_instancing';
        this.writer = writer;
    }
    writeNode(object, nodeDef) {
        if (!object.isInstancedMesh)
            return;
        const writer = this.writer;
        const mesh = object;
        const translationAttr = new Float32Array(mesh.count * 3);
        const rotationAttr = new Float32Array(mesh.count * 4);
        const scaleAttr = new Float32Array(mesh.count * 3);
        const matrix = new Matrix4();
        const position = new Vector3();
        const quaternion = new Quaternion();
        const scale = new Vector3();
        for (let i = 0; i < mesh.count; i++) {
            mesh.getMatrixAt(i, matrix);
            matrix.decompose(position, quaternion, scale);
            position.toArray(translationAttr, i * 3);
            quaternion.toArray(rotationAttr, i * 4);
            scale.toArray(scaleAttr, i * 3);
        }
        const attributes = {
            TRANSLATION: writer.processAccessor(new BufferAttribute(translationAttr, 3)),
            ROTATION: writer.processAccessor(new BufferAttribute(rotationAttr, 4)),
            SCALE: writer.processAccessor(new BufferAttribute(scaleAttr, 3)),
        };
        if (mesh.instanceColor)
            attributes._COLOR_0 = writer.processAccessor(mesh.instanceColor);
        nodeDef.extensions = nodeDef.extensions || {};
        nodeDef.extensions[this.name] = { attributes };
        writer.extensionsUsed[this.name] = true;
        writer.extensionsRequired[this.name] = true;
    }
}

async function loadGltf(url) {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(new DRACOLoader());
    return new Promise((resolve, reject) => {
        loader.load(url, resolve, null, reject);
    });
}

export { DRACOLoader, FileLoader, GLTFExporter, GLTFLoader, ImageLoader, TextureLoader, loadGltf };
//# sourceMappingURL=index.js.map
