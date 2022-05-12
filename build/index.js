import { JSDOM } from 'jsdom';
import { TextDecoder as TextDecoder$1 } from 'util';
import { Blob as Blob$1, resolveObjectURL } from 'buffer';
import { URL } from 'url';
import * as path from 'path';
import { Loader, Cache, Texture, Quaternion, LoaderUtils, Color, SpotLight, PointLight, DirectionalLight, MeshBasicMaterial, MeshPhysicalMaterial, Vector2, sRGBEncoding, TangentSpaceNormalMap, InterleavedBuffer, InterleavedBufferAttribute, BufferAttribute, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, PointsMaterial, Material, LineBasicMaterial, MeshStandardMaterial, DoubleSide, PropertyBinding, BufferGeometry, SkinnedMesh, Mesh, LineSegments, Line, LineLoop, Points, Group, PerspectiveCamera, MathUtils, OrthographicCamera, InterpolateLinear, AnimationClip, Bone, Object3D, Matrix4, Skeleton, TriangleFanDrawMode, NearestFilter, NearestMipmapNearestFilter, LinearMipmapNearestFilter, NearestMipmapLinearFilter, ClampToEdgeWrapping, MirroredRepeatWrapping, InterpolateDiscrete, FrontSide, TriangleStripDrawMode, VectorKeyframeTrack, QuaternionKeyframeTrack, NumberKeyframeTrack, Box3, Vector3, Sphere, Interpolant } from 'three';
import * as fs from 'fs/promises';
import fetch, { Request, Headers } from 'node-fetch';
import Jimp from 'jimp';
import { createDecoderModule } from 'draco3dgltf';

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
            promise = fs.readFile(url)
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
                return Jimp.read(imageBuffer).then(image => image.bitmap);
            }
            else if (/^data:/.test(url)) {
                const imageBuffer = Buffer.from(url.split(',')[1], 'base64');
                return Jimp.read(imageBuffer).then(image => image.bitmap);
            }
            else {
                return Jimp.read(url).then(image => image.bitmap);
            }
        })
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
            return new GLTFMaterialsClearcoatExtension(parser);
        });
        this.register((parser) => {
            return new GLTFTextureBasisUExtension(parser);
        });
        this.register((parser) => {
            return new GLTFTextureWebPExtension(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsSheenExtension(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsTransmissionExtension(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsVolumeExtension(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsIorExtension(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsSpecularExtension(parser);
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
                resourcePath = path.dirname(url) + path.sep;
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
        if (typeof data === 'string') {
            content = data;
        }
        else {
            if (data instanceof Buffer) {
                data = data.buffer;
            }
            const magic = LoaderUtils.decodeText(new Uint8Array(data.slice(0, 4)));
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
                content = LoaderUtils.decodeText(new Uint8Array(data));
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
                        extensions[extensionName] = new GLTFMaterialsUnlitExtension();
                        break;
                    case EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS:
                        extensions[extensionName] = new GLTFMaterialsPbrSpecularGlossinessExtension();
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
    KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS: 'KHR_materials_pbrSpecularGlossiness',
    KHR_MATERIALS_SHEEN: 'KHR_materials_sheen',
    KHR_MATERIALS_SPECULAR: 'KHR_materials_specular',
    KHR_MATERIALS_TRANSMISSION: 'KHR_materials_transmission',
    KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
    KHR_MATERIALS_VOLUME: 'KHR_materials_volume',
    KHR_TEXTURE_BASISU: 'KHR_texture_basisu',
    KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
    KHR_MESH_QUANTIZATION: 'KHR_mesh_quantization',
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
            color.fromArray(lightDef.color);
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
class GLTFMaterialsUnlitExtension {
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
                materialParams.color.fromArray(array);
                materialParams.opacity = array[3];
            }
            if (metallicRoughness.baseColorTexture !== undefined) {
                pending.push(parser.assignTexture(materialParams, 'map', metallicRoughness.baseColorTexture));
            }
        }
        return Promise.all(pending);
    }
}
class GLTFMaterialsClearcoatExtension {
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
}
class GLTFMaterialsSheenExtension {
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
            materialParams.sheenColor.fromArray(extension.sheenColorFactor);
        }
        if (extension.sheenRoughnessFactor !== undefined) {
            materialParams.sheenRoughness = extension.sheenRoughnessFactor;
        }
        if (extension.sheenColorTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'sheenColorMap', extension.sheenColorTexture));
        }
        if (extension.sheenRoughnessTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'sheenRoughnessMap', extension.sheenRoughnessTexture));
        }
        return Promise.all(pending);
    }
}
class GLTFMaterialsTransmissionExtension {
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
}
class GLTFMaterialsVolumeExtension {
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
        materialParams.attenuationColor = new Color(colorArray[0], colorArray[1], colorArray[2]);
        return Promise.all(pending);
    }
}
class GLTFMaterialsIorExtension {
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
}
class GLTFMaterialsSpecularExtension {
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
        materialParams.specularColor = new Color(colorArray[0], colorArray[1], colorArray[2]);
        if (extension.specularColorTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'specularColorMap', extension.specularColorTexture).then(function (texture) {
                texture.encoding = sRGBEncoding;
            }));
        }
        return Promise.all(pending);
    }
}
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
        const source = json.images[extension.source];
        const loader = parser.options.ktx2Loader;
        if (!loader) {
            if (json.extensionsRequired && json.extensionsRequired.indexOf(this.name) >= 0) {
                throw new Error('THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures');
            }
            else {
                return null;
            }
        }
        return parser.loadTextureImage(textureIndex, source, loader);
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
                return parser.loadTextureImage(textureIndex, source, loader);
            if (json.extensionsRequired && json.extensionsRequired.indexOf(name) >= 0) {
                throw new Error('THREE.GLTFLoader: WebP required by asset but unsupported.');
            }
            return parser.loadTexture(textureIndex);
        });
    }
    detectSupport() {
        if (!this.isSupported) {
            this.isSupported = new Promise(function (resolve) {
                resolve(false);
            });
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
        this.header = {
            magic: LoaderUtils.decodeText(new Uint8Array(data.slice(0, 4))),
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
                this.content = LoaderUtils.decodeText(contentArray);
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
                attributeTypeMap[threeAttributeName] = componentType;
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
class GLTFMeshStandardSGMaterial extends MeshStandardMaterial {
    constructor(params) {
        super();
        this.isGLTFSpecularGlossinessMaterial = true;
        const specularMapParsFragmentChunk = [
            '#ifdef USE_SPECULARMAP',
            '	uniform sampler2D specularMap;',
            '#endif'
        ].join('\n');
        const glossinessMapParsFragmentChunk = [
            '#ifdef USE_GLOSSINESSMAP',
            '	uniform sampler2D glossinessMap;',
            '#endif'
        ].join('\n');
        const specularMapFragmentChunk = [
            'vec3 specularFactor = specular;',
            '#ifdef USE_SPECULARMAP',
            '	vec4 texelSpecular = texture2D( specularMap, vUv );',
            '	// reads channel RGB, compatible with a glTF Specular-Glossiness (RGBA) texture',
            '	specularFactor *= texelSpecular.rgb;',
            '#endif'
        ].join('\n');
        const glossinessMapFragmentChunk = [
            'float glossinessFactor = glossiness;',
            '#ifdef USE_GLOSSINESSMAP',
            '	vec4 texelGlossiness = texture2D( glossinessMap, vUv );',
            '	// reads channel A, compatible with a glTF Specular-Glossiness (RGBA) texture',
            '	glossinessFactor *= texelGlossiness.a;',
            '#endif'
        ].join('\n');
        const lightPhysicalFragmentChunk = [
            'PhysicalMaterial material;',
            'material.diffuseColor = diffuseColor.rgb * ( 1. - max( specularFactor.r, max( specularFactor.g, specularFactor.b ) ) );',
            'vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );',
            'float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );',
            'material.roughness = max( 1.0 - glossinessFactor, 0.0525 ); // 0.0525 corresponds to the base mip of a 256 cubemap.',
            'material.roughness += geometryRoughness;',
            'material.roughness = min( material.roughness, 1.0 );',
            'material.specularColor = specularFactor;',
        ].join('\n');
        const uniforms = {
            specular: { value: new Color().setHex(0xffffff) },
            glossiness: { value: 1 },
            specularMap: { value: null },
            glossinessMap: { value: null }
        };
        this._extraUniforms = uniforms;
        this.onBeforeCompile = function (shader) {
            for (const uniformName in uniforms) {
                shader.uniforms[uniformName] = uniforms[uniformName];
            }
            shader.fragmentShader = shader.fragmentShader
                .replace('uniform float roughness;', 'uniform vec3 specular;')
                .replace('uniform float metalness;', 'uniform float glossiness;')
                .replace('#include <roughnessmap_pars_fragment>', specularMapParsFragmentChunk)
                .replace('#include <metalnessmap_pars_fragment>', glossinessMapParsFragmentChunk)
                .replace('#include <roughnessmap_fragment>', specularMapFragmentChunk)
                .replace('#include <metalnessmap_fragment>', glossinessMapFragmentChunk)
                .replace('#include <lights_physical_fragment>', lightPhysicalFragmentChunk);
        };
        Object.defineProperties(this, {
            specular: {
                get: function () {
                    return uniforms.specular.value;
                },
                set: function (v) {
                    uniforms.specular.value = v;
                }
            },
            specularMap: {
                get: function () {
                    return uniforms.specularMap.value;
                },
                set: function (v) {
                    uniforms.specularMap.value = v;
                    if (v) {
                        this.defines.USE_SPECULARMAP = '';
                    }
                    else {
                        delete this.defines.USE_SPECULARMAP;
                    }
                }
            },
            glossiness: {
                get: function () {
                    return uniforms.glossiness.value;
                },
                set: function (v) {
                    uniforms.glossiness.value = v;
                }
            },
            glossinessMap: {
                get: function () {
                    return uniforms.glossinessMap.value;
                },
                set: function (v) {
                    uniforms.glossinessMap.value = v;
                    if (v) {
                        this.defines.USE_GLOSSINESSMAP = '';
                        this.defines.USE_UV = '';
                    }
                    else {
                        delete this.defines.USE_GLOSSINESSMAP;
                        delete this.defines.USE_UV;
                    }
                }
            }
        });
        delete this.metalness;
        delete this.roughness;
        delete this.metalnessMap;
        delete this.roughnessMap;
        this.setValues(params);
    }
    copy(source) {
        super.copy(source);
        this.specularMap = source.specularMap;
        this.specular.copy(source.specular);
        this.glossinessMap = source.glossinessMap;
        this.glossiness = source.glossiness;
        delete this.metalness;
        delete this.roughness;
        delete this.metalnessMap;
        delete this.roughnessMap;
        return this;
    }
}
class GLTFMaterialsPbrSpecularGlossinessExtension {
    constructor() {
        this.name = EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
        this.specularGlossinessParams = [
            'color',
            'map',
            'lightMap',
            'lightMapIntensity',
            'aoMap',
            'aoMapIntensity',
            'emissive',
            'emissiveIntensity',
            'emissiveMap',
            'bumpMap',
            'bumpScale',
            'normalMap',
            'normalMapType',
            'displacementMap',
            'displacementScale',
            'displacementBias',
            'specularMap',
            'specular',
            'glossinessMap',
            'glossiness',
            'alphaMap',
            'envMap',
            'envMapIntensity',
            'refractionRatio',
        ];
    }
    getMaterialType() {
        return GLTFMeshStandardSGMaterial;
    }
    extendParams(materialParams, materialDef, parser) {
        const pbrSpecularGlossiness = materialDef.extensions[this.name];
        materialParams.color = new Color(1.0, 1.0, 1.0);
        materialParams.opacity = 1.0;
        const pending = [];
        if (Array.isArray(pbrSpecularGlossiness.diffuseFactor)) {
            const array = pbrSpecularGlossiness.diffuseFactor;
            materialParams.color.fromArray(array);
            materialParams.opacity = array[3];
        }
        if (pbrSpecularGlossiness.diffuseTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'map', pbrSpecularGlossiness.diffuseTexture));
        }
        materialParams.emissive = new Color(0.0, 0.0, 0.0);
        materialParams.glossiness = pbrSpecularGlossiness.glossinessFactor !== undefined ? pbrSpecularGlossiness.glossinessFactor : 1.0;
        materialParams.specular = new Color(1.0, 1.0, 1.0);
        if (Array.isArray(pbrSpecularGlossiness.specularFactor)) {
            materialParams.specular.fromArray(pbrSpecularGlossiness.specularFactor);
        }
        if (pbrSpecularGlossiness.specularGlossinessTexture !== undefined) {
            const specGlossMapDef = pbrSpecularGlossiness.specularGlossinessTexture;
            pending.push(parser.assignTexture(materialParams, 'glossinessMap', specGlossMapDef));
            pending.push(parser.assignTexture(materialParams, 'specularMap', specGlossMapDef));
        }
        return Promise.all(pending);
    }
    createMaterial(materialParams) {
        const material = new GLTFMeshStandardSGMaterial(materialParams);
        material.fog = true;
        material.color = materialParams.color;
        material.map = materialParams.map === undefined ? null : materialParams.map;
        material.lightMap = null;
        material.lightMapIntensity = 1.0;
        material.aoMap = materialParams.aoMap === undefined ? null : materialParams.aoMap;
        material.aoMapIntensity = 1.0;
        material.emissive = materialParams.emissive;
        material.emissiveIntensity = 1.0;
        material.emissiveMap = materialParams.emissiveMap === undefined ? null : materialParams.emissiveMap;
        material.bumpMap = materialParams.bumpMap === undefined ? null : materialParams.bumpMap;
        material.bumpScale = 1;
        material.normalMap = materialParams.normalMap === undefined ? null : materialParams.normalMap;
        material.normalMapType = TangentSpaceNormalMap;
        if (materialParams.normalScale)
            material.normalScale = materialParams.normalScale;
        material.displacementMap = null;
        material.displacementScale = 1;
        material.displacementBias = 0;
        material.specularMap = materialParams.specularMap === undefined ? null : materialParams.specularMap;
        material.specular = materialParams.specular;
        material.glossinessMap = materialParams.glossinessMap === undefined ? null : materialParams.glossinessMap;
        material.glossiness = materialParams.glossiness;
        material.alphaMap = null;
        material.envMap = materialParams.envMap === undefined ? null : materialParams.envMap;
        material.envMapIntensity = 1.0;
        material.refractionRatio = 0.98;
        return material;
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
const WEBGL_CONSTANTS = {
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
const PATH_PROPERTIES = {
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
            return Promise.resolve(null);
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
        const source = json.images[textureDef.source];
        let loader = this.textureLoader;
        if (source.uri) {
            const handler = options.manager.getHandler(source.uri);
            if (handler !== null)
                loader = handler;
        }
        return this.loadTextureImage(textureIndex, source, loader);
    }
    loadTextureImage(textureIndex, source, loader) {
        const parser = this;
        const json = this.json;
        const options = this.options;
        const textureDef = json.textures[textureIndex];
        const cacheKey = (source.uri || source.bufferView) + ':' + textureDef.sampler;
        if (this.textureCache[cacheKey]) {
            return this.textureCache[cacheKey];
        }
        const URL = global.URL;
        let sourceURI = source.uri || '';
        let isObjectURL = false;
        if (source.bufferView !== undefined) {
            sourceURI = parser.getDependency('bufferView', source.bufferView).then(function (bufferView) {
                isObjectURL = true;
                const blob = new Blob([bufferView], { type: source.mimeType });
                sourceURI = URL.createObjectURL(blob);
                return sourceURI;
            });
        }
        else if (source.uri === undefined) {
            throw new Error('THREE.GLTFLoader: Image ' + textureIndex + ' is missing URI and bufferView');
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
        }).catch(() => {
            console.error('THREE.GLTFLoader: Couldn\'t load texture', sourceURI);
            return null;
        });
        this.textureCache[cacheKey] = promise;
        return promise;
    }
    assignTexture(materialParams, mapName, mapDef) {
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
            if (material.isGLTFSpecularGlossinessMaterial)
                cacheKey += 'specular-glossiness:';
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
        if (materialExtensions[EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS]) {
            const sgExtension = extensions[EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS];
            materialType = sgExtension.getMaterialType();
            pending.push(sgExtension.extendParams(materialParams, materialDef, parser));
        }
        else if (materialExtensions[EXTENSIONS.KHR_MATERIALS_UNLIT]) {
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
                materialParams.color.fromArray(array);
                materialParams.opacity = array[3];
            }
            if (metallicRoughness.baseColorTexture !== undefined) {
                pending.push(parser.assignTexture(materialParams, 'map', metallicRoughness.baseColorTexture));
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
            materialParams.emissive = new Color().fromArray(materialDef.emissiveFactor);
        }
        if (materialDef.emissiveTexture !== undefined && materialType !== MeshBasicMaterial) {
            pending.push(parser.assignTexture(materialParams, 'emissiveMap', materialDef.emissiveTexture));
        }
        return Promise.all(pending).then(function () {
            let material;
            if (materialType === GLTFMeshStandardSGMaterial) {
                material = extensions[EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS].createMaterial(materialParams);
            }
            else {
                material = new materialType(materialParams);
            }
            if (materialDef.name)
                material.name = materialDef.name;
            if (material.map)
                material.map.encoding = sRGBEncoding;
            if (material.emissiveMap)
                material.emissiveMap.encoding = sRGBEncoding;
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
                if (primitive.mode === WEBGL_CONSTANTS.TRIANGLES ||
                    primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP ||
                    primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN ||
                    primitive.mode === undefined) {
                    mesh = meshDef.isSkinnedMesh === true
                        ? new SkinnedMesh(geometry, material)
                        : new Mesh(geometry, material);
                    if (mesh.isSkinnedMesh === true && !mesh.geometry.attributes.skinWeight.normalized) {
                        mesh.normalizeSkinWeights();
                    }
                    if (primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP) {
                        mesh.geometry = toTrianglesDrawMode(mesh.geometry, TriangleStripDrawMode);
                    }
                    else if (primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN) {
                        mesh.geometry = toTrianglesDrawMode(mesh.geometry, TriangleFanDrawMode);
                    }
                }
                else if (primitive.mode === WEBGL_CONSTANTS.LINES) {
                    mesh = new LineSegments(geometry, material);
                }
                else if (primitive.mode === WEBGL_CONSTANTS.LINE_STRIP) {
                    mesh = new Line(geometry, material);
                }
                else if (primitive.mode === WEBGL_CONSTANTS.LINE_LOOP) {
                    mesh = new LineLoop(geometry, material);
                }
                else if (primitive.mode === WEBGL_CONSTANTS.POINTS) {
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
            const name = target.node !== undefined ? target.node : target.id;
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
                switch (PATH_PROPERTIES[target.path]) {
                    case PATH_PROPERTIES.weights:
                        TypedKeyframeTrack = NumberKeyframeTrack;
                        break;
                    case PATH_PROPERTIES.rotation:
                        TypedKeyframeTrack = QuaternionKeyframeTrack;
                        break;
                    case PATH_PROPERTIES.translation:
                    case PATH_PROPERTIES.scale:
                    default:
                        TypedKeyframeTrack = VectorKeyframeTrack;
                        break;
                }
                const targetName = node.name ? node.name : node.uuid;
                const interpolation = sampler.interpolation !== undefined ? INTERPOLATION[sampler.interpolation] : InterpolateLinear;
                const targetNames = [];
                if (PATH_PROPERTIES[target.path] === PATH_PROPERTIES.weights) {
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
                    const track = new TypedKeyframeTrack(targetNames[j] + '.' + PATH_PROPERTIES[target.path], inputAccessor.array, outputArray, interpolation);
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
        this.decoderConfig = {};
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
        for (const attribute of Object.keys(taskConfig.attributeTypes)) {
            const type = taskConfig.attributeTypes[attribute];
            if (type.BYTES_PER_ELEMENT !== undefined) {
                taskConfig.attributeTypes[attribute] = type.name;
            }
        }
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
        const geometryPending = new Promise(async (resolve, reject) => {
            const draco = await createDecoderModule(this.decoderConfig);
            const decoder = new draco.Decoder();
            const decoderBuffer = new draco.DecoderBuffer();
            decoderBuffer.Init(new Int8Array(buffer), buffer.byteLength);
            try {
                const geometry = decodeGeometry(draco, decoder, decoderBuffer, taskConfig);
                const buffers = geometry.attributes.map((attr) => attr.array.buffer);
                if (geometry.index)
                    buffers.push(geometry.index.array.buffer);
                resolve(this._createGeometry(geometry));
            }
            catch (error) {
                console.error(error);
                reject(error);
            }
            finally {
                draco.destroy(decoderBuffer);
                draco.destroy(decoder);
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
        return this;
    }
}
function decodeGeometry(draco, decoder, decoderBuffer, taskConfig) {
    const attributeIDs = taskConfig.attributeIDs;
    const attributeTypes = taskConfig.attributeTypes;
    let dracoGeometry;
    let decodingStatus;
    const geometryType = decoder.GetEncodedGeometryType(decoderBuffer);
    if (geometryType === draco.TRIANGULAR_MESH) {
        dracoGeometry = new draco.Mesh();
        decodingStatus = decoder.DecodeBufferToMesh(decoderBuffer, dracoGeometry);
    }
    else if (geometryType === draco.POINT_CLOUD) {
        dracoGeometry = new draco.PointCloud();
        decodingStatus = decoder.DecodeBufferToPointCloud(decoderBuffer, dracoGeometry);
    }
    else {
        throw new Error('THREE.DRACOLoader: Unexpected geometry type.');
    }
    if (!decodingStatus.ok() || dracoGeometry.ptr === 0) {
        throw new Error('THREE.DRACOLoader: Decoding failed: ' + decodingStatus.error_msg());
    }
    const geometry = { index: null, attributes: [] };
    for (const attributeName of Object.keys(attributeIDs)) {
        const attributeType = global[attributeTypes[attributeName]];
        let attribute;
        let attributeID;
        if (taskConfig.useUniqueIDs) {
            attributeID = attributeIDs[attributeName];
            attribute = decoder.GetAttributeByUniqueId(dracoGeometry, attributeID);
        }
        else {
            attributeID = decoder.GetAttributeId(dracoGeometry, draco[attributeIDs[attributeName]]);
            if (attributeID === -1)
                continue;
            attribute = decoder.GetAttribute(dracoGeometry, attributeID);
        }
        geometry.attributes.push(decodeAttribute(draco, decoder, dracoGeometry, attributeName, attributeType, attribute));
    }
    if (geometryType === draco.TRIANGULAR_MESH) {
        geometry.index = decodeIndex(draco, decoder, dracoGeometry);
    }
    draco.destroy(dracoGeometry);
    return geometry;
}
function decodeIndex(draco, decoder, dracoGeometry) {
    const numFaces = dracoGeometry.num_faces();
    const numIndices = numFaces * 3;
    const byteLength = numIndices * 4;
    const ptr = draco._malloc(byteLength);
    decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
    const index = new Uint32Array(draco.HEAPF32.buffer, ptr, numIndices).slice();
    draco._free(ptr);
    return { array: index, itemSize: 1 };
}
function decodeAttribute(draco, decoder, dracoGeometry, attributeName, attributeType, attribute) {
    const numComponents = attribute.num_components();
    const numPoints = dracoGeometry.num_points();
    const numValues = numPoints * numComponents;
    const byteLength = numValues * attributeType.BYTES_PER_ELEMENT;
    const dataType = getDracoDataType(draco, attributeType);
    const ptr = draco._malloc(byteLength);
    decoder.GetAttributeDataArrayForAllPoints(dracoGeometry, attribute, dataType, byteLength, ptr);
    const array = new attributeType(draco.HEAPF32.buffer, ptr, numValues).slice();
    draco._free(ptr);
    return {
        name: attributeName,
        array,
        itemSize: numComponents
    };
}
function getDracoDataType(draco, attributeType) {
    switch (attributeType) {
        case Float32Array: return draco.DT_FLOAT32;
        case Int8Array: return draco.DT_INT8;
        case Int16Array: return draco.DT_INT16;
        case Int32Array: return draco.DT_INT32;
        case Uint8Array: return draco.DT_UINT8;
        case Uint16Array: return draco.DT_UINT16;
        case Uint32Array: return draco.DT_UINT32;
    }
}

async function loadGltf(url) {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(new DRACOLoader());
    return new Promise((resolve, reject) => {
        loader.load(url, resolve, null, reject);
    });
}

export { DRACOLoader, FileLoader, GLTFLoader, ImageLoader, TextureLoader, loadGltf };
