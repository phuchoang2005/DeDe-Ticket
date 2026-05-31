import { createAudioPlayer } from 'expo-audio';

// Lazily-created shared player for the short scan-confirmation beep. Created on
// first use (not at import) so the bundled asset is only loaded when needed.
let player = null;

function getPlayer() {
  if (!player) {
    player = createAudioPlayer(require('../../assets/beep.wav'));
  }
  return player;
}

// Best-effort: a beep should never break or block the scan flow.
export function playScanBeep() {
  try {
    const p = getPlayer();
    p.seekTo(0);
    p.play();
  } catch {
    // Audio unavailable (no device, muted, etc.) -- ignore.
  }
}
