// Dynamic Expo config. Starts from the static app.json and injects the API base
// URL from the environment (EXPO_PUBLIC_API_BASE_URL), so the backend host is
// never hardcoded in tracked config. Falls back to a LAN default for first run.
const appJson = require('./app.json');

const DEFAULT_API_BASE_URL = 'http://192.168.2.18:8080';

module.exports = () => {
  const expo = appJson.expo;
  return {
    ...expo,
    extra: {
      ...(expo.extra || {}),
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL,
    },
  };
};
