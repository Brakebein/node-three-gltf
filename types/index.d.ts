import './polyfill';
import { GLTF } from './GLTFLoader';
export * from './GLTFLoader';
export * from './DRACOLoader';
export * from './FileLoader';
export * from './TextureLoader';
export * from './ImageLoader';
/**
 * Load (draco-compressed) gltf file from local file or web resource and decode/parse content.
 * @param url - Path to gltf file or web resource
 */
export declare function loadGltf(url: string): Promise<GLTF>;
