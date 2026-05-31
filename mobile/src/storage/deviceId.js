import * as SecureStore from 'expo-secure-store';

// A per-device UUID sent on every scan and persisted server-side on
// check_ins.device_id for forensics. Generated once, then reused.
const DEVICE_ID_KEY = 'dede.scan.deviceId';

export async function getDeviceId() {
  try {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (id && id.length >= 8) return id;
    id = generateUuid();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
    return id;
  } catch {
    // Secure store unavailable: fall back to a per-session id.
    return generateUuid();
  }
}

// RFC4122 v4. This is an opaque forensic tag, not security-sensitive, so the
// Math.random fallback is acceptable; prefer the platform RNG when present.
export function generateUuid() {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
