import { JSDOM } from 'jsdom';
import { TextDecoder } from 'util';
import { Blob } from 'buffer';
import { URL } from 'url';

const dom = new JSDOM().window;

if (!global.DOMParser) {
  global.DOMParser = dom.DOMParser;
}
if (!global.Blob) {
  // @ts-ignore
  global.Blob = Blob;
}
if (!global.URL) {
  // @ts-ignore
  global.URL = URL;
}
if (!global.TextDecoder) {
  global.TextDecoder = TextDecoder;
}
