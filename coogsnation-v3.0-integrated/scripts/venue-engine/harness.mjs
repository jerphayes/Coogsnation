import { JSDOM } from 'jsdom';

/* ── DOM ─────────────────────────────────────────────────────────────── */
const dom = new JSDOM(
  `<!DOCTYPE html><html><body>
     <canvas id="viewport"></canvas><div id="ui-root"></div>
     <div id="loader"><i id="loader-fill"></i><p id="loader-msg"></p></div>
   </body></html>`,
  { url: 'http://localhost/', pretendToBeVisual: true }
);

const ctx2d = () => {
  const noop = () => {};
  const c = new Proxy({}, {
    get(_, k) {
      if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'canvas') return { width: 1, height: 1 };
      return typeof k === 'string' ? noop : undefined;
    },
    set() { return true; }
  });
  return c;
};
dom.window.HTMLCanvasElement.prototype.getContext = function (type) {
  return type === '2d' ? ctx2d() : null;
};

globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Element = dom.window.Element;
globalThis.self = dom.window;
globalThis.location = dom.window.location;
globalThis.requestAnimationFrame = cb => setTimeout(() => cb(performance.now()), 0);
globalThis.cancelAnimationFrame = clearTimeout;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.addEventListener = () => {};
globalThis.innerWidth = 1600; globalThis.innerHeight = 900; globalThis.devicePixelRatio = 1;
globalThis.fetch = async (url) => {
  const fs = await import('node:fs/promises');
  // Site-root URLs map to Vite's public directory on disk.
  const path = String(url).startsWith('/')
    ? `client/public${url}`
    : String(url).replace(/^\.\//, '');
  try { return { ok: true, status: 200, json: async () => JSON.parse(await fs.readFile(path, 'utf8')) }; }
  catch (e) { return { ok: false, status: 404, json: async () => { throw e; } }; }
};

/* ── renderer stub ───────────────────────────────────────────────────── */
globalThis.__rs = {
  domElement: dom.window.document.getElementById('viewport'),
  capabilities: { getMaxAnisotropy: () => 16, isWebGL2: true },
  shadowMap: { enabled: false, type: 0 },
  info: { render: { calls: 0, triangles: 0 } },
  outputColorSpace: '', toneMapping: 0, toneMappingExposure: 1,
  setPixelRatio() {}, getPixelRatio() { return 1; }, setSize() {},
  setClearColor() {}, render() {}, dispose() {}
};


export const rendererStub = globalThis.__rs;
