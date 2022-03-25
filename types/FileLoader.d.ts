import { Loader, LoadingManager } from 'three';
export declare class FileLoader extends Loader {
    mimeType: string;
    responseType: string;
    constructor(manager?: LoadingManager);
    load(url: string, onLoad?: (response: string | ArrayBuffer) => void, onProgress?: () => void, onError?: (err: Error) => void): void;
    setResponseType(value: string): FileLoader;
    setMimeType(value: string): FileLoader;
}
