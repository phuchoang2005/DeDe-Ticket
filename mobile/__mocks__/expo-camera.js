// Test stand-in for expo-camera. CameraView renders as a host element that
// forwards its props (so tests can read facing/barcodeScannerSettings and invoke
// onBarcodeScanned). useCameraPermissions defaults to granted; tests override it
// with mockReturnValue when they need the denied path.
const React = require('react');

function CameraView(props) {
  return React.createElement('CameraView', props, props.children || null);
}

const useCameraPermissions = jest.fn(() => [
  { granted: true, status: 'granted', canAskAgain: true },
  jest.fn(async () => ({ granted: true, status: 'granted' })),
]);

module.exports = { __esModule: true, CameraView, useCameraPermissions };
