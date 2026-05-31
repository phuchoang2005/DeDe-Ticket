import { apiClient } from './apiClient';

// POST /v1/auth/login -> { token, expiresInMinutes, user: { id, email, fullName, phone, roles } }
// apiClient's response interceptor unwraps to the response body, or rejects with
// an ApiError carrying the backend envelope code/message.
export function login(email, password) {
  return apiClient.post('/v1/auth/login', { email, password });
}
