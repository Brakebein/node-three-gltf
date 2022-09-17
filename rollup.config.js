import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';

export default {
  external: ['jsdom', 'sharp', 'three'],
  input: 'src/index.ts',
  plugins: [
    nodeResolve(),
    typescript({
      compilerOptions: {
        removeComments: true,
      }
    }),
    copy({
      targets: [
        { src: 'src/draco/draco_decoder.wasm', dest: 'build' }
      ]
    }),
  ],
  output: [
    {
      file: 'build/index.js',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'build/index.cjs',
      format: 'cjs',
      sourcemap: true,
    }
  ]
};
