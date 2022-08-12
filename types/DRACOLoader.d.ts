import { BufferGeometry, Loader, LoadingManager } from 'three';
export declare class DRACOLoader extends Loader {
    decoderConfig: {};
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
    load(url: string, onLoad: (geometry: BufferGeometry) => void, onProgress?: () => void, onError?: (err: Error) => void): void;
    /** @deprecated Kept for backward-compatibility with previous DRACOLoader versions. */
    decodeDracoFile(buffer: ArrayBuffer, callback: (geometry: BufferGeometry) => void, attributeIDs?: any, attributeTypes?: any): void;
    decodeGeometry(buffer: ArrayBuffer, taskConfig: any): Promise<BufferGeometry>;
    _createGeometry(geometryData: any): BufferGeometry;
    preload(): DRACOLoader;
}
