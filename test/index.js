import test from 'ava';
import { BufferGeometry, Mesh, Texture } from 'three';
import { GLTFLoader, loadGltf, TextureLoader } from '../build/index.js';

test('load texture from remote', async (t) => {

  const loader = new TextureLoader();
  const texture = await new Promise((resolve, reject) => {
    loader.load('https://raw.githubusercontent.com/Brakebein/node-three-gltf/main/test/texture.jpg', resolve, null, (e) => {
      console.error(e);
      reject(e);
      }
    );
  });

  t.truthy(texture instanceof Texture, 'check Texture');

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
