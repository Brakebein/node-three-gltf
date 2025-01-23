import './polyfill.js';
import { GLTF } from './GLTFLoader.js';
export * from './GLTFLoader.js';
export * from './DRACOLoader.js';
export * from './FileLoader.js';
export * from './TextureLoader.js';
export * from './ImageLoader.js';
export * from './GLTFExporter.js';
/**
 * Load (draco-compressed) gltf file from local file or web resource and decode/parse content.
 * @param url - Path to gltf file or web resource
 */
export declare function loadGltf(url: string): Promise<GLTF>;
