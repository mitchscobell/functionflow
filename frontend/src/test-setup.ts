import "@testing-library/jest-dom/vitest";

// Node 22+ ships a built-in localStorage that lacks standard Storage methods
// (clear, key, length). Override it with a spec-compliant in-memory shim so
// jsdom tests work correctly.
const storage = new Map<string, string>();
const localStorageShim: Storage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, String(value));
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  get length() {
    return storage.size;
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
};
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageShim,
  writable: true,
  configurable: true,
});

// Stub window.matchMedia for jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
