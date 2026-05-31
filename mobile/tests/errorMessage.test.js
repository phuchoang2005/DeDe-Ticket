import { friendlyError } from '../src/utils/errorMessage';

describe('friendlyError', () => {
  test('NETWORK_ERROR gets connection guidance', () => {
    expect(friendlyError({ code: 'NETWORK_ERROR' })).toMatch(/kết nối máy chủ/i);
  });

  test('TIMEOUT gets a retry message', () => {
    expect(friendlyError({ code: 'TIMEOUT' })).toMatch(/quá lâu/i);
  });

  test('bad-gateway family maps to temporarily unavailable', () => {
    for (const code of ['HTTP_502', 'HTTP_503', 'HTTP_504']) {
      expect(friendlyError({ code })).toMatch(/tạm thời không khả dụng/i);
    }
  });

  test('other errors fall back to the server message', () => {
    expect(friendlyError({ code: 'INVALID_CREDENTIALS', message: 'Sai mật khẩu' })).toBe('Sai mật khẩu');
  });

  test('a message-less error gets a generic fallback', () => {
    expect(friendlyError({ code: 'WEIRD' })).toMatch(/Đã xảy ra lỗi/i);
  });
});
