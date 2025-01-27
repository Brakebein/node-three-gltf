import test, { registerCompletionHandler } from 'ava';
import { Buffer } from 'node:buffer';
import { BufferGeometry, Mesh, Texture } from 'three';
import { GLTFExporter, GLTFLoader, ImageLoader, loadGltf, TextureLoader } from '../build/index.js';

registerCompletionHandler(() => {
  process.exit();
});

test('load texture from remote', async (t) => {

  const loader = new TextureLoader();
  const texture = await new Promise((resolve, reject) => {
    loader.load(
      'https://raw.githubusercontent.com/Brakebein/node-three-gltf/main/test/texture.jpg',
      resolve,
      null,
      (e) => {
        console.error(e);
        reject(e);
      }
    );
  });

  t.truthy(texture instanceof Texture, 'check Texture');

});

test('load image', async (t) => {

  const loader = new ImageLoader();
  const image = await new Promise((resolve, reject) => {
    loader.load('test/texture.jpg', resolve, null, (e) => {
      console.error(e);
      reject(e);
    });
  });

  t.truthy(image.data instanceof Buffer, 'check Buffer');
  t.is(image.width, 512, 'check width');
  t.is(image.width, 512, 'check height');
  t.is(image.channels, 4, 'check channels');

});

function checkObject(t, object) {
  t.truthy(object.geometry instanceof BufferGeometry, 'check BufferGeometry');
  t.truthy(object.material.map instanceof Texture, 'check Texture');
}

test('load binary gltf with GLTFLoader', async (t) => {

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load('test/knot-binary.glb', resolve, null, reject);
  });
  checkObject(t, gltf.scene.children[0].children[0]);

});

test('load gltf with separate texture and bin file', async (t) => {

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load('test/knot-separate.gltf', resolve, null, reject);
  });
  checkObject(t, gltf.scene.children[0].children[0]);

});

test('load gltf with embedded texture', async (t) => {

  const gltf = await loadGltf('test/knot-embed.gltf');
  checkObject(t, gltf.scene.children[0].children[0]);

});

test('load gltf from remote', async (t) => {

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load('https://raw.githubusercontent.com/Brakebein/node-three-gltf/main/test/knot-embed.gltf', resolve, null, reject);
  });
  checkObject(t, gltf.scene.children[0].children[0]);

});

test('load gltf with separate texture and bin file from remote', async (t) => {

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.load('https://raw.githubusercontent.com/Brakebein/node-three-gltf/main/test/knot-separate.gltf', resolve, null, reject);
  });
  checkObject(t, gltf.scene.children[0].children[0]);

});

test('load draco-compressed model with loadGltf()', async (t) => {

  const gltf = await loadGltf('test/knot-draco.gltf');
  checkObject(t, gltf.scene.children[0].children[0]);

});

test('load draco-compressed dgm.gltf', async (t) => {

  const gltf = await loadGltf('test/dgm.gltf');

  gltf.scene.children[0].traverse((child) => {
    if (child instanceof Mesh) {
      t.truthy(child.geometry instanceof BufferGeometry, 'check BufferGeometry');
    }
  });

});

test('load gltf with animations', async (t) => {

  const gltf = await loadGltf('test/LittlestTokyo.glb');

  gltf.scene.traverse((child) => {
    if (child instanceof Mesh) {
      t.truthy(child.geometry instanceof BufferGeometry, 'check BufferGeometry');
    }
  });

});

test('check static LOG_TEXTURE_LOAD_ERROR', (t) => {

  t.true(GLTFLoader.LOG_TEXTURE_LOAD_ERROR);

});

test('export scene as gltf json', async (t) => {

  const gltf = await loadGltf('test/knot-separate.gltf');
  const exporter = new GLTFExporter();
  const gltfJson = await exporter.parseAsync(gltf.scene);

  t.notThrows(() => {
    JSON.parse(JSON.stringify(gltfJson));
  }, 'should be valid JSON');
  t.like(gltfJson.asset, {
    version: '2.0'
  }, 'check gltf json asset block');
  t.like(gltfJson.nodes[0], {
    name: 'Torus_Knot001',
    extras: {
      name: 'Torus_Knot001'
    },
    mesh: 0
  }, 'check first node');

});

test('export scene as binary glb', async (t) => {

  const gltf = await loadGltf('test/knot-separate.gltf');
  const exporter = new GLTFExporter();
  const glbBuffer = await exporter.parseAsync(gltf.scene, { binary: true });

  t.truthy(glbBuffer instanceof Buffer, 'check glb buffer');

});
