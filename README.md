# node-three-gltf

This package offers a modified [three.js](https://threejs.org/) GLTFLoader to load glTF files in a Node.js environment.
Files can be loaded from local file system or from web resources.
DRACO-compressed glTF files are also supported.

In order to work in a non-browser environment, following classes had to be adopted from three.js and modified:

* [`GLTFLoader`](https://threejs.org/docs/index.html#examples/en/loaders/GLTFLoader)
* [`DRACOLoader`](https://threejs.org/docs/index.html#examples/en/loaders/DRACOLoader)
* [`FileLoader`](https://threejs.org/docs/index.html#api/en/loaders/FileLoader)
* [`ImageLoader`](https://threejs.org/docs/index.html#api/en/loaders/ImageLoader)
* [`TextureLoader`](https://threejs.org/docs/index.html#api/en/loaders/TextureLoader)

All are exposed and can be used independently.

## Usage

Install via NPM:

```
npm install node-three-gltf
```

Use with ES modules or TypeScript:

```typescript
import { DRACOLoader, GLTFLoader, loadGltf, TextureLoader } from 'node-three-gltf';

// init GLTFLoader and pass a path to a local file or a url to a web resource
const loader = new GLTFLoader();
loader.setDRACOLoader(new DRACOLoader());

loader.load('path/to/file', gltf => {
  console.log(gltf.scene.children);
});

// there is also a small utility function that instantiates GLTFLoader and DRACOLoader
// and returns a Promise with the loaded content
const gltf = await loadGltf('path/to/file');
console.log(gltf.scene.children);

// use TextureLoader, ImageLoader, or FileLoader independently
new TextureLoader().load('path/to/file', texture => {
  console.log(texture);
});
```
