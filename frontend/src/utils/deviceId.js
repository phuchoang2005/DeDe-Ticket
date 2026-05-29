const KEY = 'dede.scan.deviceId';

// Persists a per-device UUID used by the scan endpoint for forensics.
// Stored on check_ins.device_id server-side.
export function getDeviceId() {
  try {
    let id = localStorage.getItem(KEY);
    if (id && id.length >= 8) return id;
    id = generateUuid();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    // Private mode or storage disabled — fall back to a per-session id.
    return generateUuid();
  }
}

function generateUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // RFC4122 v4 fallback for older browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
