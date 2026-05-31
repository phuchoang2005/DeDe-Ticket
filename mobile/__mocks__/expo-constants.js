// Deterministic expo-constants for tests: a fixed extra.apiBaseUrl so env.js
// has a known configured default.
module.exports = {
  __esModule: true,
  default: {
    expoConfig: {
      extra: { apiBaseUrl: 'http://test.local:8080' },
    },
  },
};
