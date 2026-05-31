import axios from 'axios';
import { getApiBaseUrl } from '../config/env';
import { getToken } from '../storage/secureStore';

// Mirrors the web SPA's apiClient: a single axios instance with a JWT request
// interceptor and a response interceptor that maps the backend error envelope
// ({ error: { code, message, details, traceId } }) to a typed ApiError.
// Screens must call through this, never axios/fetch directly.

const REQUEST_TIMEOUT_MS = 10000;

export class ApiError extends Error {
  constructor({ code, message, details, traceId, status }) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.traceId = traceId;
    this.status = status;
  }
}

// Pure mapping from an axios error to an ApiError. Exported for unit tests.
// Scan failures arrive here as enveloped codes: ALREADY_USED (409),
// TICKET_NOT_FOUND (404), TICKET_NOT_VALID (409) — passed through verbatim.
export function mapAxiosError(err) {
  if (err.response) {
    const envelope = err.response.data && err.response.data.error;
    if (envelope) {
      return new ApiError({ ...envelope, status: err.response.status });
    }
    return new ApiError({
      code: `HTTP_${err.response.status}`,
      message: err.response.statusText || 'Request failed',
      status: err.response.status,
    });
  }
  if (err.code === 'ECONNABORTED') {
    return new ApiError({ code: 'TIMEOUT', message: 'Request timed out', status: 0 });
  }
  return new ApiError({ code: 'NETWORK_ERROR', message: err.message || 'Network error', status: 0 });
}

// Resolves the base URL fresh per request (so a runtime change via setApiBaseUrl
// takes effect) and attaches the bearer token when present. Exported for tests.
export async function authRequestInterceptor(config) {
  config.baseURL = getApiBaseUrl();
  const token = await getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use(authRequestInterceptor);

apiClient.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(mapAxiosError(err)),
);
