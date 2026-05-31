jest.mock('../src/services/apiClient', () => ({
  apiClient: { post: jest.fn() },
}));

import { apiClient } from '../src/services/apiClient';
import { scanTicket } from '../src/services/scanService';

beforeEach(() => {
  apiClient.post.mockReset();
});

describe('scanService.scanTicket', () => {
  test('posts the qr code and device id to /v1/tickets/scan', async () => {
    apiClient.post.mockResolvedValue({ ticketId: 1, eventTitle: 'E' });
    const res = await scanTicket('QR123', 'device-1');
    expect(apiClient.post).toHaveBeenCalledWith('/v1/tickets/scan', { qrCode: 'QR123', deviceId: 'device-1' });
    expect(res.ticketId).toBe(1);
  });

  test('propagates ApiError-style rejections', async () => {
    apiClient.post.mockRejectedValue(Object.assign(new Error('used'), { code: 'ALREADY_USED' }));
    await expect(scanTicket('QR', 'd')).rejects.toMatchObject({ code: 'ALREADY_USED' });
  });
});
