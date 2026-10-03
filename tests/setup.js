/**
 * Test Environment Setup for Node.js Native Runner
 * Shims localStorage and minimal browser APIs for headless domain unit testing.
 */

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

if (!globalThis.localStorage) {
  globalThis.localStorage = new MockLocalStorage();
}

// Minimal window/i18n mock if not present
if (!globalThis.window) {
  globalThis.window = globalThis;
}
