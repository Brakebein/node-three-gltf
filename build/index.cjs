'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var jsdom = require('jsdom');
var node_util = require('node:util');
var node_buffer = require('node:buffer');
var node_url = require('node:url');
var node_path = require('node:path');
var three = require('three');
var promises = require('node:fs/promises');
var fetch = require('node-fetch');
var base64Js = require('base64-js');
var sharp = require('sharp');
var node_worker_threads = require('node:worker_threads');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var fetch__default = /*#__PURE__*/_interopDefaultLegacy(fetch);
var sharp__default = /*#__PURE__*/_interopDefaultLegacy(sharp);

const dom = new jsdom.JSDOM().window;
if (!global.DOMParser) {
    global.DOMParser = dom.DOMParser;
}
if (!global.Blob) {
    global.Blob = node_buffer.Blob;
}
if (!global.URL) {
    global.URL = node_url.URL;
}
if (!global.TextDecoder) {
    global.TextDecoder = node_util.TextDecoder;
}

const loading = {};
class FileLoader extends three.Loader {
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
            promise = promises.readFile(url)
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
            const buffer = base64Js.toByteArray(base64);
            promise = Promise.resolve(buffer.buffer);
        }
        else {
            const req = new fetch.Request(url, {
                headers: new fetch.Headers(this.requestHeader),
                credentials: this.withCredentials ? 'include' : 'same-origin',
            });
            promise = fetch__default["default"](req)
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

class ImageLoader extends three.Loader {
    constructor(manager) {
        super(manager);
    }
    load(url, onLoad, onProgress, onError) {
        if (this.path !== undefined)
            url = this.path + url;
        url = this.manager.resolveURL(url);
        const scope = this;
        const cached = three.Cache.get(url);
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
                const blob = node_buffer.resolveObjectURL(url);
                const imageBuffer = node_buffer.Buffer.from(await blob.arrayBuffer());
                return sharp__default["default"](imageBuffer);
            }
            else if (/^data:/.test(url)) {
                const base64 = url.split(';base64,').pop();
                const imageBuffer = base64Js.toByteArray(base64);
                return sharp__default["default"](imageBuffer);
            }
            else if (/^https?:\/\//.test(url)) {
                const req = new fetch.Request(url, {
                    headers: new fetch.Headers(this.requestHeader),
                    credentials: this.withCredentials ? 'include' : 'same-origin',
                });
                const response = await fetch__default["default"](req);
                const buffer = node_buffer.Buffer.from(await response.arrayBuffer());
                return sharp__default["default"](buffer);
            }
            else {
                return sharp__default["default"](url);
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
            three.Cache.add(url, data);
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

class TextureLoader extends three.Loader {
    constructor(manager) {
        super(manager);
    }
    load(url, onLoad, onProgress, onError) {
        const texture = new three.Texture();
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

class GLTFLoader extends three.Loader {
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
        this.register(function (parser) {
            return new GLTFMaterialsEmissiveStrengthExtension(parser);
        });
        this.register((parser) => {
            return new GLTFMaterialsSpecularExtension(parser);
        });
        this.register(function (parser) {
            return new GLTFMaterialsAnisotropyExtension(parser);
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
                resourcePath = node_path.dirname(url) + node_path.sep;
            }
            else {
                resourcePath = three.LoaderUtils.extractUrlBase(url);
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
            if (data instanceof node_buffer.Buffer) {
                data = data.buffer;
            }
            const magic = three.LoaderUtils.decodeText(new Uint8Array(data.slice(0, 4)));
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
                content = three.LoaderUtils.decodeText(new Uint8Array(data));
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
        const color = new three.Color(0xffffff);
        if (lightDef.color !== undefined)
            color.setRGB(lightDef.color[0], lightDef.color[1], lightDef.color[2], three.LinearSRGBColorSpace);
        const range = lightDef.range !== undefined ? lightDef.range : 0;
        switch (lightDef.type) {
            case 'directional':
                lightNode = new three.DirectionalLight(color);
                lightNode.target.position.set(0, 0, -1);
                lightNode.add(lightNode.target);
                break;
            case 'point':
                lightNode = new three.PointLight(color);
                lightNode.distance = range;
                break;
            case 'spot':
                lightNode = new three.SpotLight(color);
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
        return three.MeshBasicMaterial;
    }
    extendParams(materialParams, materialDef, parser) {
        const pending = [];
        materialParams.color = new three.Color(1.0, 1.0, 1.0);
        materialParams.opacity = 1.0;
        const metallicRoughness = materialDef.pbrMetallicRoughness;
        if (metallicRoughness) {
            if (Array.isArray(metallicRoughness.baseColorFactor)) {
                const array = metallicRoughness.baseColorFactor;
                materialParams.color.setRGB(array[0], array[1], array[2], three.LinearSRGBColorSpace);
                materialParams.opacity = array[3];
            }
            if (metallicRoughness.baseColorTexture !== undefined) {
                pending.push(parser.assignTexture(materialParams, 'map', metallicRoughness.baseColorTexture, three.SRGBColorSpace));
            }
        }
        return Promise.all(pending);
    }
}
class GLTFMaterialsEmissiveStrengthExtension {
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
        return three.MeshPhysicalMaterial;
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
                materialParams.clearcoatNormalScale = new three.Vector2(scale, scale);
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
        return three.MeshPhysicalMaterial;
    }
    extendMaterialParams(materialIndex, materialParams) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name]) {
            return Promise.resolve();
        }
        const pending = [];
        materialParams.sheenColor = new three.Color(0, 0, 0);
        materialParams.sheenRoughness = 0;
        materialParams.sheen = 1;
        const extension = materialDef.extensions[this.name];
        if (extension.sheenColorFactor !== undefined) {
            const colorFactor = extension.sheenColorFactor;
            materialParams.sheenColor.setRGB(colorFactor[0], colorFactor[1], colorFactor[2], three.LinearSRGBColorSpace);
        }
        if (extension.sheenRoughnessFactor !== undefined) {
            materialParams.sheenRoughness = extension.sheenRoughnessFactor;
        }
        if (extension.sheenColorTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'sheenColorMap', extension.sheenColorTexture, three.SRGBColorSpace));
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
        return three.MeshPhysicalMaterial;
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
        return three.MeshPhysicalMaterial;
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
        materialParams.attenuationColor = new three.Color().setRGB(colorArray[0], colorArray[1], colorArray[2], three.LinearSRGBColorSpace);
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
        return three.MeshPhysicalMaterial;
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
        return three.MeshPhysicalMaterial;
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
        materialParams.specularColor = new three.Color().setRGB(colorArray[0], colorArray[1], colorArray[2], three.LinearSRGBColorSpace);
        if (extension.specularColorTexture !== undefined) {
            pending.push(parser.assignTexture(materialParams, 'specularColorMap', extension.specularColorTexture, three.SRGBColorSpace));
        }
        return Promise.all(pending);
    }
}
class GLTFMaterialsAnisotropyExtension {
    constructor(parser) {
        this.name = EXTENSIONS.KHR_MATERIALS_ANISOTROPY;
        this.parser = parser;
    }
    getMaterialType(materialIndex) {
        const parser = this.parser;
        const materialDef = parser.json.materials[materialIndex];
        if (!materialDef.extensions || !materialDef.extensions[this.name])
            return null;
        return three.MeshPhysicalMaterial;
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
            magic: three.LoaderUtils.decodeText(new Uint8Array(data.slice(0, 4))),
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
                this.content = three.LoaderUtils.decodeText(contentArray);
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
class GLTFCubicSplineInterpolant extends three.Interpolant {
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
const _q = new three.Quaternion();
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
    9728: three.NearestFilter,
    9729: three.LinearFilter,
    9984: three.NearestMipmapNearestFilter,
    9985: three.LinearMipmapNearestFilter,
    9986: three.NearestMipmapLinearFilter,
    9987: three.LinearMipmapLinearFilter
};
const WEBGL_WRAPPINGS = {
    33071: three.ClampToEdgeWrapping,
    33648: three.MirroredRepeatWrapping,
    10497: three.RepeatWrapping
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
    LINEAR: three.InterpolateLinear,
    STEP: three.InterpolateDiscrete
};
const ALPHA_MODES = {
    OPAQUE: 'OPAQUE',
    MASK: 'MASK',
    BLEND: 'BLEND'
};
function createDefaultMaterial(cache) {
    if (cache['DefaultMaterial'] === undefined) {
        cache['DefaultMaterial'] = new three.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0x000000,
            metalness: 1,
            roughness: 1,
            transparent: false,
            depthTest: true,
            side: three.FrontSide
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
            loader.load(three.LoaderUtils.resolveURL(bufferDef.uri, options.path), resolve, undefined, function () {
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
                    ib = new three.InterleavedBuffer(array, byteStride / elementBytes);
                    parser.cache.add(ibCacheKey, ib);
                }
                bufferAttribute = new three.InterleavedBufferAttribute(ib, itemSize, (byteOffset % byteStride) / elementBytes, normalized);
            }
            else {
                if (bufferView === null) {
                    array = new TypedArray(accessorDef.count * itemSize);
                }
                else {
                    array = new TypedArray(bufferView, byteOffset, accessorDef.count * itemSize);
                }
                bufferAttribute = new three.BufferAttribute(array, itemSize, normalized);
            }
            if (accessorDef.sparse !== undefined) {
                const itemSizeIndices = WEBGL_TYPE_SIZES.SCALAR;
                const TypedArrayIndices = WEBGL_COMPONENT_TYPES[accessorDef.sparse.indices.componentType];
                const byteOffsetIndices = accessorDef.sparse.indices.byteOffset || 0;
                const byteOffsetValues = accessorDef.sparse.values.byteOffset || 0;
                const sparseIndices = new TypedArrayIndices(bufferViews[1], byteOffsetIndices, accessorDef.sparse.count * itemSizeIndices);
                const sparseValues = new TypedArray(bufferViews[2], byteOffsetValues, accessorDef.sparse.count * itemSize);
                if (bufferView !== null) {
                    bufferAttribute = new three.BufferAttribute(bufferAttribute.array.slice(), bufferAttribute.itemSize, bufferAttribute.normalized);
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
            texture.magFilter = WEBGL_FILTERS[sampler.magFilter] || three.LinearFilter;
            texture.minFilter = WEBGL_FILTERS[sampler.minFilter] || three.LinearMipmapLinearFilter;
            texture.wrapS = WEBGL_WRAPPINGS[sampler.wrapS] || three.RepeatWrapping;
            texture.wrapT = WEBGL_WRAPPINGS[sampler.wrapT] || three.RepeatWrapping;
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
            three.LoaderUtils.resolveURL(sourceURI, options.path);
            return new Promise(function (resolve, reject) {
                loader.load(three.LoaderUtils.resolveURL(sourceURI, options.path), resolve, undefined, reject);
            });
        }).then(function (texture) {
            if (isObjectURL === true) {
                URL.revokeObjectURL(sourceURI);
            }
            return texture;
        }).catch((error) => {
            console.error('THREE.GLTFLoader: Couldn\'t load texture', sourceURI);
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
            if (colorSpace !== undefined) {
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
                pointsMaterial = new three.PointsMaterial();
                three.Material.prototype.copy.call(pointsMaterial, material);
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
                lineMaterial = new three.LineBasicMaterial();
                three.Material.prototype.copy.call(lineMaterial, material);
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
        return three.MeshStandardMaterial;
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
            materialParams.color = new three.Color(1.0, 1.0, 1.0);
            materialParams.opacity = 1.0;
            if (Array.isArray(metallicRoughness.baseColorFactor)) {
                const array = metallicRoughness.baseColorFactor;
                materialParams.color.setRGB(array[0], array[1], array[2], three.LinearSRGBColorSpace);
                materialParams.opacity = array[3];
            }
            if (metallicRoughness.baseColorTexture !== undefined) {
                pending.push(parser.assignTexture(materialParams, 'map', metallicRoughness.baseColorTexture, three.SRGBColorSpace));
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
            materialParams.side = three.DoubleSide;
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
        if (materialDef.normalTexture !== undefined && materialType !== three.MeshBasicMaterial) {
            pending.push(parser.assignTexture(materialParams, 'normalMap', materialDef.normalTexture));
            materialParams.normalScale = new three.Vector2(1, 1);
            if (materialDef.normalTexture.scale !== undefined) {
                const scale = materialDef.normalTexture.scale;
                materialParams.normalScale.set(scale, scale);
            }
        }
        if (materialDef.occlusionTexture !== undefined && materialType !== three.MeshBasicMaterial) {
            pending.push(parser.assignTexture(materialParams, 'aoMap', materialDef.occlusionTexture));
            if (materialDef.occlusionTexture.strength !== undefined) {
                materialParams.aoMapIntensity = materialDef.occlusionTexture.strength;
            }
        }
        if (materialDef.emissiveFactor !== undefined && materialType !== three.MeshBasicMaterial) {
            const emissiveFactor = materialDef.emissiveFactor;
            materialParams.emissive = new three.Color().setRGB(emissiveFactor[0], emissiveFactor[1], emissiveFactor[2], three.LinearSRGBColorSpace);
        }
        if (materialDef.emissiveTexture !== undefined && materialType !== three.MeshBasicMaterial) {
            pending.push(parser.assignTexture(materialParams, 'emissiveMap', materialDef.emissiveTexture, three.SRGBColorSpace));
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
        const sanitizedName = three.PropertyBinding.sanitizeNodeName(originalName || '');
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
                    geometryPromise = addPrimitiveAttributes(new three.BufferGeometry(), primitive, parser);
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
                        ? new three.SkinnedMesh(geometry, material)
                        : new three.Mesh(geometry, material);
                    if (mesh.isSkinnedMesh === true && !mesh.geometry.attributes.skinWeight.normalized) {
                        mesh.normalizeSkinWeights();
                    }
                    if (primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP) {
                        mesh.geometry = toTrianglesDrawMode(mesh.geometry, three.TriangleStripDrawMode);
                    }
                    else if (primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN) {
                        mesh.geometry = toTrianglesDrawMode(mesh.geometry, three.TriangleFanDrawMode);
                    }
                }
                else if (primitive.mode === WEBGL_CONSTANTS.LINES) {
                    mesh = new three.LineSegments(geometry, material);
                }
                else if (primitive.mode === WEBGL_CONSTANTS.LINE_STRIP) {
                    mesh = new three.Line(geometry, material);
                }
                else if (primitive.mode === WEBGL_CONSTANTS.LINE_LOOP) {
                    mesh = new three.LineLoop(geometry, material);
                }
                else if (primitive.mode === WEBGL_CONSTANTS.POINTS) {
                    mesh = new three.Points(geometry, material);
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
            const group = new three.Group();
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
            camera = new three.PerspectiveCamera(three.MathUtils.radToDeg(params.yfov), params.aspectRatio || 1, params.znear || 1, params.zfar || 2e6);
        }
        else if (cameraDef.type === 'orthographic') {
            camera = new three.OrthographicCamera(-params.xmag, params.xmag, params.ymag, -params.ymag, params.znear, params.zfar);
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
                switch (PATH_PROPERTIES[target.path]) {
                    case PATH_PROPERTIES.weights:
                        TypedKeyframeTrack = three.NumberKeyframeTrack;
                        break;
                    case PATH_PROPERTIES.rotation:
                        TypedKeyframeTrack = three.QuaternionKeyframeTrack;
                        break;
                    case PATH_PROPERTIES.translation:
                    case PATH_PROPERTIES.scale:
                    default:
                        TypedKeyframeTrack = three.VectorKeyframeTrack;
                        break;
                }
                const targetName = node.name ? node.name : node.uuid;
                const interpolation = sampler.interpolation !== undefined ? INTERPOLATION[sampler.interpolation] : three.InterpolateLinear;
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
                            const interpolantType = (this instanceof three.QuaternionKeyframeTrack)
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
            return new three.AnimationClip(name, undefined, tracks);
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
                node = new three.Bone();
            }
            else if (objects.length > 1) {
                node = new three.Group();
            }
            else if (objects.length === 1) {
                node = objects[0];
            }
            else {
                node = new three.Object3D();
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
                const matrix = new three.Matrix4();
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
        const scene = new three.Group();
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
                    if (key instanceof three.Material || key instanceof three.Texture) {
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
                        const mat = new three.Matrix4();
                        if (skinEntry.inverseBindMatrices !== undefined) {
                            mat.fromArray(skinEntry.inverseBindMatrices.array, j * 16);
                        }
                        boneInverses.push(mat);
                    }
                    else {
                        console.warn('THREE.GLTFLoader: Joint "%s" could not be found.', skinEntry.joints[j]);
                    }
                }
                mesh.bind(new three.Skeleton(bones, boneInverses), mesh.matrixWorld);
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
    const box = new three.Box3();
    if (attributes.POSITION !== undefined) {
        const accessor = parser.json.accessors[attributes.POSITION];
        const min = accessor.min;
        const max = accessor.max;
        if (min !== undefined && max !== undefined) {
            box.set(new three.Vector3(min[0], min[1], min[2]), new three.Vector3(max[0], max[1], max[2]));
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
        const maxDisplacement = new three.Vector3();
        const vector = new three.Vector3();
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
    const sphere = new three.Sphere();
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
    if (three.ColorManagement.workingColorSpace !== three.LinearSRGBColorSpace && 'COLOR_0' in attributes) {
        console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${three.ColorManagement.workingColorSpace}" not supported.`);
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
    if (drawMode === three.TriangleFanDrawMode) {
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
class DRACOLoader extends three.Loader {
    constructor(manager) {
        super(manager);
        this.decoderPath = node_path.dirname(node_url.fileURLToPath((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('index.cjs', document.baseURI).href)))) + node_path.sep;
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
        const geometry = new three.BufferGeometry();
        if (geometryData.index) {
            geometry.setIndex(new three.BufferAttribute(geometryData.index.array, 1));
        }
        for (const attribute of geometryData.attributes) {
            const name = attribute.name;
            const array = attribute.array;
            const itemSize = attribute.itemSize;
            geometry.setAttribute(name, new three.BufferAttribute(array, itemSize));
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
                const worker = new node_worker_threads.Worker(this.workerSourceURL);
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

async function loadGltf(url) {
    const loader = new GLTFLoader();
    loader.setDRACOLoader(new DRACOLoader());
    return new Promise((resolve, reject) => {
        loader.load(url, resolve, null, reject);
    });
}

exports.DRACOLoader = DRACOLoader;
exports.FileLoader = FileLoader;
exports.GLTFLoader = GLTFLoader;
exports.ImageLoader = ImageLoader;
exports.TextureLoader = TextureLoader;
exports.loadGltf = loadGltf;
//# sourceMappingURL=index.cjs.map
