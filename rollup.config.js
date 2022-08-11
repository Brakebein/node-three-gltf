import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';

export default {
  external: ['draco3dgltf', 'fs/promises', 'jimp', 'jsdom', 'path', 'three'],
  input: 'src/index.ts',
  plugins: [
    nodeResolve(),
    typescript({
      compilerOptions: {
        removeComments: true
      }
    })
  ],
  output: [
    {
      file: 'build/index.js',
      format: 'es'
    },
    {
      file: 'build/index.cjs',
      format: 'cjs',
    }
  ]
};
