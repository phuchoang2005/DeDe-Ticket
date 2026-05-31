jest.mock('../src/services/scanService', () => ({ scanTicket: jest.fn() }));
jest.mock('../src/utils/beep', () => ({ playScanBeep: jest.fn() }));
jest.mock('../src/storage/deviceId', () => ({
  getDeviceId: jest.fn(async () => 'device-1'),
  generateUuid: () => 'uuid',
}));

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCameraPermissions } from 'expo-camera';
import { AuthProvider } from '../src/store/AuthContext';
import ScanScreen from '../src/screens/ScanScreen';
import { scanTicket } from '../src/services/scanService';
import { playScanBeep } from '../src/utils/beep';

const GRANTED = [{ granted: true, status: 'granted', canAskAgain: true }, jest.fn(async () => ({ granted: true }))];
const METRICS = { frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

beforeEach(() => {
  scanTicket.mockReset();
  playScanBeep.mockReset();
  useCameraPermissions.mockReturnValue(GRANTED);
});

async function mount() {
  let tree;
  await act(async () => {
    tree = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <AuthProvider>
          <ScanScreen />
        </AuthProvider>
      </SafeAreaProvider>,
    );
  });
  // Flush the async getDeviceId effect.
  await act(async () => {});
  return tree;
}

function inputWith(tree, testID) {
  return tree.root.find((n) => n.props && n.props.testID === testID && typeof n.props.onChangeText === 'function');
}

function setInput(tree, testID, value) {
  act(() => {
    inputWith(tree, testID).props.onChangeText(value);
  });
}

function cameraNode(tree) {
  return tree.root.find((n) => n.props && n.props.testID === 'camera');
}

function pressableWith(tree, testID) {
  return tree.root.find((n) => n.props && n.props.testID === testID && typeof n.props.onPress === 'function');
}

async function fireScan(tree, data) {
  const cb = cameraNode(tree).props.onBarcodeScanned;
  await act(async () => {
    await cb({ data });
  });
}

function json(tree) {
  return JSON.stringify(tree.toJSON());
}

describe('ScanScreen', () => {
  test('configures the camera for QR detection only and is active by default', async () => {
    const tree = await mount();
    expect(cameraNode(tree).props.barcodeScannerSettings).toEqual({ barcodeTypes: ['qr'] });
    expect(cameraNode(tree).props.facing).toBe('back');
    expect(cameraNode(tree).props.active).toBe(true);
  });

  test('freezes the camera while a result is shown and resumes after Scan Next', async () => {
    scanTicket.mockResolvedValue({ eventTitle: 'E', section: 'S', rowLabel: 'A', seatNumber: 1, ticketId: 1 });
    const tree = await mount();

    await fireScan(tree, 'QR');
    expect(cameraNode(tree).props.active).toBe(false);

    await act(async () => {
      pressableWith(tree, 'scan-next').props.onPress();
    });
    expect(cameraNode(tree).props.active).toBe(true);
  });

  test('plays a beep on a successful scan only', async () => {
    scanTicket.mockResolvedValue({ eventTitle: 'E', section: 'S', rowLabel: 'A', seatNumber: 1, ticketId: 1 });
    const tree = await mount();
    await fireScan(tree, 'QR');
    expect(playScanBeep).toHaveBeenCalledTimes(1);
  });

  test('does not beep when the scan fails', async () => {
    scanTicket.mockRejectedValue(Object.assign(new Error('x'), { code: 'TICKET_NOT_FOUND' }));
    const tree = await mount();
    await fireScan(tree, 'QR');
    expect(playScanBeep).not.toHaveBeenCalled();
  });

  test('a successful scan posts qr + deviceId and shows the check-in notice', async () => {
    scanTicket.mockResolvedValue({
      eventTitle: 'Concert 2026',
      section: 'VIP',
      rowLabel: 'A',
      seatNumber: 3,
      checkedInAt: '2026-05-31T10:00:00Z',
      ticketId: 42,
    });
    const tree = await mount();
    await fireScan(tree, 'QR-OK');

    expect(scanTicket).toHaveBeenCalledWith('QR-OK', 'device-1');
    const text = json(tree);
    expect(text).toContain('Check-in thành công');
    expect(text).toContain('Concert 2026');
  });

  test('locks scanning so rapid duplicate frames hit the API once', async () => {
    scanTicket.mockResolvedValue({ eventTitle: 'E', section: 'S', rowLabel: 'A', seatNumber: 1, ticketId: 1 });
    const tree = await mount();
    const cb = cameraNode(tree).props.onBarcodeScanned;
    await act(async () => {
      await Promise.all([cb({ data: 'SAME' }), cb({ data: 'SAME' })]);
    });
    expect(scanTicket).toHaveBeenCalledTimes(1);
  });

  test('Scan Next clears the notice and resumes scanning', async () => {
    scanTicket.mockResolvedValue({ eventTitle: 'E', section: 'S', rowLabel: 'A', seatNumber: 1, ticketId: 1 });
    const tree = await mount();

    await fireScan(tree, 'FIRST');
    expect(json(tree)).toContain('Check-in thành công');

    await act(async () => {
      pressableWith(tree, 'scan-next').props.onPress();
    });
    expect(json(tree)).not.toContain('Check-in thành công');

    await fireScan(tree, 'SECOND');
    expect(scanTicket).toHaveBeenCalledTimes(2);
  });

  test('maps ALREADY_USED to the used-ticket notice', async () => {
    scanTicket.mockRejectedValue(Object.assign(new Error('Vé này đã check-in.'), { code: 'ALREADY_USED' }));
    const tree = await mount();
    await fireScan(tree, 'QR');
    const text = json(tree);
    expect(text).toContain('Vé đã được sử dụng');
    expect(text).toContain('Vé này đã check-in.');
  });

  test('maps TICKET_NOT_FOUND to the not-found notice', async () => {
    scanTicket.mockRejectedValue(Object.assign(new Error('x'), { code: 'TICKET_NOT_FOUND' }));
    const tree = await mount();
    await fireScan(tree, 'QR');
    expect(json(tree)).toContain('Không tìm thấy vé');
  });

  test('maps TICKET_NOT_VALID to the invalid notice', async () => {
    scanTicket.mockRejectedValue(Object.assign(new Error('x'), { code: 'TICKET_NOT_VALID' }));
    const tree = await mount();
    await fireScan(tree, 'QR');
    expect(json(tree)).toContain('Vé không hợp lệ');
  });

  test('toggling the facing control switches the camera seamlessly', async () => {
    const tree = await mount();
    expect(cameraNode(tree).props.facing).toBe('back');
    await act(async () => {
      pressableWith(tree, 'facing-front').props.onPress();
    });
    expect(cameraNode(tree).props.facing).toBe('front');
  });

  test('shows a permission prompt and no camera when access is not granted', async () => {
    useCameraPermissions.mockReturnValue([{ granted: false, status: 'denied', canAskAgain: true }, jest.fn()]);
    const tree = await mount();
    expect(json(tree)).toContain('Cần quyền truy cập camera');
    expect(tree.root.findAll((n) => n.props && n.props.testID === 'camera').length).toBe(0);
  });

  test('manual code entry runs the same scan flow and freezes the camera', async () => {
    scanTicket.mockResolvedValue({ eventTitle: 'E', section: 'S', rowLabel: 'A', seatNumber: 1, ticketId: 7 });
    const tree = await mount();

    setInput(tree, 'manual-input', 'ABC123');
    await act(async () => {
      await pressableWith(tree, 'manual-submit').props.onPress();
    });

    expect(scanTicket).toHaveBeenCalledWith('ABC123', 'device-1');
    expect(json(tree)).toContain('Check-in thành công');
    expect(cameraNode(tree).props.active).toBe(false);
  });

  test('empty manual input does not call the API', async () => {
    const tree = await mount();
    await act(async () => {
      await pressableWith(tree, 'manual-submit').props.onPress();
    });
    expect(scanTicket).not.toHaveBeenCalled();
  });

  test('uses a keyboard-avoiding scroll layout so the manual input stays visible', async () => {
    const tree = await mount();
    expect(tree.root.findAll((n) => n.props && n.props.testID === 'keyboard-avoider').length).toBeGreaterThan(0);
    const scroll = tree.root.findAll(
      (n) => n.props && n.props.testID === 'scan-scroll' && n.props.keyboardShouldPersistTaps,
    )[0];
    expect(scroll).toBeDefined();
    expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
  });

  test('formats the check-in timestamp instead of showing the raw ISO string', async () => {
    scanTicket.mockResolvedValue({
      eventTitle: 'E',
      section: 'S',
      rowLabel: 'A',
      seatNumber: 1,
      ticketId: 1,
      checkedInAt: '2026-05-31T11:15:09.593077191Z',
    });
    const tree = await mount();
    await fireScan(tree, 'QR');
    const text = json(tree);
    expect(text).not.toContain('593077191');
    expect(text).not.toContain('2026-05-31T11:15:09');
    expect(text).toMatch(/\d{2}:\d{2}:\d{2} \d{2}\/\d{2}\/\d{4}/);
  });

  test('Scan Next after manual entry clears the input and unfreezes the camera', async () => {
    scanTicket.mockResolvedValue({ eventTitle: 'E', section: 'S', rowLabel: 'A', seatNumber: 1, ticketId: 7 });
    const tree = await mount();

    setInput(tree, 'manual-input', 'ABC123');
    await act(async () => {
      await pressableWith(tree, 'manual-submit').props.onPress();
    });
    await act(async () => {
      pressableWith(tree, 'scan-next').props.onPress();
    });

    expect(inputWith(tree, 'manual-input').props.value).toBe('');
    expect(cameraNode(tree).props.active).toBe(true);
  });
});
