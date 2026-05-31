jest.mock('../src/services/apiClient', () => ({
  apiClient: { post: jest.fn() },
}));

import { apiClient } from '../src/services/apiClient';
import { login } from '../src/services/authService';

beforeEach(() => {
  apiClient.post.mockReset();
});

describe('authService.login', () => {
  test('posts credentials to /v1/auth/login and returns the body', async () => {
    apiClient.post.mockResolvedValue({ token: 'jwt', user: { roles: ['SCANNER'] } });
    const res = await login('a@b.test', 'pw');
    expect(apiClient.post).toHaveBeenCalledWith('/v1/auth/login', { email: 'a@b.test', password: 'pw' });
    expect(res.token).toBe('jwt');
  });

  test('propagates errors from apiClient', async () => {
    apiClient.post.mockRejectedValue(new Error('boom'));
    await expect(login('a@b.test', 'pw')).rejects.toThrow('boom');
  });
});
