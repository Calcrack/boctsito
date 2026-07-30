// sombras mínimas del navegador para renderizar en node
const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
globalThis.window = globalThis;
globalThis.document = {
  documentElement: { style: { setProperty() {}, removeProperty() {} } },
  body: {}, activeElement: null,
  addEventListener() {}, removeEventListener() {},
};
