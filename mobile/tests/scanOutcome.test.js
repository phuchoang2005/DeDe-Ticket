import { describeScanError } from '../src/utils/scanOutcome';

describe('describeScanError', () => {
  test('ALREADY_USED is a warn-tone used-ticket title', () => {
    expect(describeScanError('ALREADY_USED')).toEqual({ title: 'Vé đã được sử dụng', tone: 'warn' });
  });

  test('TICKET_NOT_FOUND is a danger-tone not-found title', () => {
    expect(describeScanError('TICKET_NOT_FOUND')).toEqual({ title: 'Không tìm thấy vé', tone: 'danger' });
  });

  test('TICKET_NOT_VALID is a danger-tone invalid title', () => {
    expect(describeScanError('TICKET_NOT_VALID')).toEqual({ title: 'Vé không hợp lệ', tone: 'danger' });
  });

  test('unknown codes fall back to a generic danger error', () => {
    expect(describeScanError('NETWORK_ERROR')).toEqual({ title: 'Lỗi quét vé', tone: 'danger' });
    expect(describeScanError(undefined)).toEqual({ title: 'Lỗi quét vé', tone: 'danger' });
  });
});
