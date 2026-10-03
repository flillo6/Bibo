/**
 * Test Environment Setup for Node.js Native Runner
 * Shims localStorage and unrefs background handles for clean test exits.
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

globalThis.localStorage = new MockLocalStorage();

// Unref Node.js BroadcastChannel so unit tests exit instantaneously without hanging the event loop
if (typeof globalThis.BroadcastChannel !== 'undefined') {
  try {
    const OrigBC = globalThis.BroadcastChannel;
    globalThis.BroadcastChannel = class extends OrigBC {
      constructor(name) {
        super(name);
        try {
          if (typeof this.unref === 'function') {
            this.unref();
          }
        } catch (_) {}
      }
    };
  } catch (_) {}
}
