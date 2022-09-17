import { readFileSync, writeFileSync } from 'fs';

const polyfill = readFileSync('./src/draco/polyfill.js', { encoding: 'utf8' });
const dracoWorker = readFileSync('./src/draco/DRACOWorker.js', { encoding: 'utf8' });

const bodyJs = [
  polyfill,
  '/* draco decoder */',
  readFileSync('./src/draco/draco_decoder.js'),
  '',
  '/* worker */',
  dracoWorker
].join( '\n' );

const bodyWasm = [
  polyfill,
  '/* draco decoder */',
  readFileSync('./src/draco/draco_wasm_wrapper.js'),
  '',
  '/* worker */',
  dracoWorker
].join( '\n' );

writeFileSync('./build/draco_worker.js', bodyJs, { encoding: 'utf8' });
writeFileSync('./build/draco_worker_wasm.js', bodyWasm, { encoding: 'utf8' });
