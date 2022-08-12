import { Loader, LoadingManager, Texture } from 'three';
export declare class TextureLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(url: string, onLoad?: (texture: Texture) => void, onProgress?: () => void, onError?: (err: Error) => void): Texture;
}
