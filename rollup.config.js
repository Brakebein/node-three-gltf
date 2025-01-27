import typescript from '@rollup/plugin-typescript';
import nodeResolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import dts from 'rollup-plugin-dts';

const external = ['base64-js', 'jsdom', 'node-fetch', 'sharp', 'three'];

/** @type {import('rollup').RollupOptions[]} */
const config = [
  {
    external,
    input: 'src/index.ts',
    plugins: [
      nodeResolve(),
      typescript({
        compilerOptions: {
          removeComments: true,
        },
      }),
      copy({
        targets: [
          { src: 'src/draco/draco_decoder.wasm', dest: 'build' },
        ],
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
      },
    ],
  },
  {
    external,
    input: 'src/index.ts',
    plugins: [
      nodeResolve(),
      typescript({
        compilerOptions: {
          declaration: true,
          declarationDir: 'types',
          emitDeclarationOnly: true,
          sourceMap: false,
        },
      }),
    ],
    output: [
      { file: 'types/index.js' },
    ],
  },
  {
    input: 'types/index.d.ts',
    plugins: [nodeResolve(), dts()],
    output: [
      {
        file: 'build/index.d.ts',
        format: 'es',
      },
      {
        file: 'build/index.d.cts',
        format: 'cjs',
      },
    ],
  },
];

export default config;
