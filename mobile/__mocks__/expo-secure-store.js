// In-memory stand-in for expo-secure-store so storage-backed code is unit
// testable in Node without the native module. Auto-applied by Jest for this
// node module.
const store = new Map();

module.exports = {
  getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
  setItemAsync: jest.fn(async (key, value) => {
    store.set(key, String(value));
  }),
  deleteItemAsync: jest.fn(async (key) => {
    store.delete(key);
  }),
  // Test helper: wipe everything between tests.
  __reset: () => store.clear(),
};
