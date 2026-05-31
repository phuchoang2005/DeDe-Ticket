import { ApiError, mapAxiosError, authRequestInterceptor } from '../src/services/apiClient';
import { setApiBaseUrl, resetApiBaseUrl } from '../src/config/env';
import { setToken, clearToken } from '../src/storage/secureStore';

describe('mapAxiosError', () => {
  test('maps an enveloped 409 ALREADY_USED to ApiError, preserving fields', () => {
    const err = {
      response: {
        status: 409,
        data: { error: { code: 'ALREADY_USED', message: 'Ve da duoc su dung', traceId: 't-1' } },
      },
    };
    const e = mapAxiosError(err);
    expect(e).toBeInstanceOf(ApiError);
    expect(e.code).toBe('ALREADY_USED');
    expect(e.status).toBe(409);
    expect(e.traceId).toBe('t-1');
    expect(e.message).toBe('Ve da duoc su dung');
  });

  test('maps an enveloped 404 TICKET_NOT_FOUND', () => {
    const e = mapAxiosError({
      response: { status: 404, data: { error: { code: 'TICKET_NOT_FOUND', message: 'Khong tim thay ve' } } },
    });
    expect(e.code).toBe('TICKET_NOT_FOUND');
    expect(e.status).toBe(404);
  });

  test('maps an enveloped 409 TICKET_NOT_VALID', () => {
    const e = mapAxiosError({
      response: { status: 409, data: { error: { code: 'TICKET_NOT_VALID', message: 'Ve khong hop le' } } },
    });
    expect(e.code).toBe('TICKET_NOT_VALID');
    expect(e.status).toBe(409);
  });

  test('falls back to HTTP_<status> when the body has no error envelope', () => {
    const e = mapAxiosError({ response: { status: 500, statusText: 'Server Error', data: {} } });
    expect(e.code).toBe('HTTP_500');
    expect(e.status).toBe(500);
    expect(e.message).toBe('Server Error');
  });

  test('maps a timeout (ECONNABORTED) to TIMEOUT', () => {
    const e = mapAxiosError({ code: 'ECONNABORTED', message: 'timeout of 10000ms exceeded' });
    expect(e.code).toBe('TIMEOUT');
    expect(e.status).toBe(0);
  });

  test('maps a no-response error to NETWORK_ERROR', () => {
    const e = mapAxiosError({ message: 'Network Error' });
    expect(e.code).toBe('NETWORK_ERROR');
    expect(e.status).toBe(0);
  });
});

describe('authRequestInterceptor', () => {
  beforeEach(async () => {
    await clearToken();
    resetApiBaseUrl();
  });

  test('resolves the current base URL and attaches the bearer token', async () => {
    setApiBaseUrl('http://10.0.0.5:8080/');
    await setToken('jwt-123');
    const cfg = await authRequestInterceptor({ headers: {} });
    expect(cfg.baseURL).toBe('http://10.0.0.5:8080');
    expect(cfg.headers.Authorization).toBe('Bearer jwt-123');
  });

  test('omits Authorization when no token is stored', async () => {
    const cfg = await authRequestInterceptor({ headers: {} });
    expect(cfg.headers.Authorization).toBeUndefined();
  });
});
