import { Loader, LoadingManager } from 'three';
export declare class ImageLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(url: string, onLoad?: (image: ArrayBuffer) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: Error) => void): void;
}
