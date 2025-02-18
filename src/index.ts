import './polyfill';
import { GLTF, GLTFLoader } from './GLTFLoader';
import { DRACOLoader } from './DRACOLoader';

export * from './GLTFLoader';
export * from './DRACOLoader';
export * from './FileLoader';
export * from './TextureLoader';
export * from './ImageLoader';
export * from './GLTFExporter';

/**
 * Load (draco-compressed) gltf file from local file or web resource and decode/parse content.
 * @param url - Path to gltf file or web resource
 */
export async function loadGltf(url: string): Promise<GLTF> {

  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  loader.setDRACOLoader(dracoLoader);

  try {

    return await loader.loadAsync(url);

  } finally {

    dracoLoader.dispose();

  }

}
