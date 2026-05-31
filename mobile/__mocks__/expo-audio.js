// Test stand-in for expo-audio so no native audio module is touched.
function createAudioPlayer() {
  return {
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(),
    remove: jest.fn(),
  };
}

module.exports = {
  __esModule: true,
  createAudioPlayer: jest.fn(createAudioPlayer),
  setAudioModeAsync: jest.fn(async () => {}),
};
