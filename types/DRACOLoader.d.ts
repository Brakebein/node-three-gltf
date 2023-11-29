import { BufferGeometry, Loader, LoadingManager } from 'three';
export declare class DRACOLoader extends Loader {
    decoderPath: string;
    decoderConfig: {
        [key: string]: any;
    };
    decoderPending: any;
    workerLimit: number;
    workerPool: any[];
    workerNextTaskID: number;
    workerSourceURL: string;
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
    setWorkerLimit(workerLimit: number): this;
    load(url: string, onLoad: (geometry: BufferGeometry) => void, onProgress?: (event: ProgressEvent) => void, onError?: (err: Error) => void): void;
    decodeDracoFile(buffer: ArrayBuffer, callback: (geometry: BufferGeometry) => void, attributeIDs?: any, attributeTypes?: any): void;
    decodeGeometry(buffer: ArrayBuffer, taskConfig: any): Promise<BufferGeometry>;
    _createGeometry(geometryData: any): BufferGeometry;
    preload(): this;
    _loadLibrary(url: string, responseType: string): Promise<unknown>;
    _initDecoder(): any;
    _getWorker(taskID: any, taskCost: any): any;
    _releaseTask(worker: any, taskID: any): void;
    dispose(): this;
}
