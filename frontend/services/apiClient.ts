import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

/** Shape of the backend error envelope: `{ error: { code, message, details, traceId } }`. */
interface ErrorEnvelope {
  code?: string;
  message?: string;
  details?: unknown;
  traceId?: string;
}

/**
 * Resolve the API base URL with a runtime-first cascade:
 *   1. `window.__APP_CONFIG__.apiBaseUrl` (injected by public/config.js at deploy time)
 *   2. `process.env.NEXT_PUBLIC_API_BASE_URL` (build-time)
 *   3. '' (same-origin; relies on the Next `/v1` rewrite to the backend)
 */
const runtimeBase = (typeof window !== 'undefined' && window.__APP_CONFIG__ && window.__APP_CONFIG__.apiBaseUrl) || '';
const envBase = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const baseURL = runtimeBase || envBase || '';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Attach the bearer token (stored in localStorage) to every outgoing request.
apiClient.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const t = localStorage.getItem('token');
    if (t) cfg.headers.Authorization = `Bearer ${t}`;
  }
  return cfg;
});

/** Normalised error thrown by the API layer; carries the backend envelope fields. */
export class ApiError extends Error {
  code?: string;
  details?: unknown;
  traceId?: string;
  status: number;

  constructor({ code, message, details, traceId, status }: ErrorEnvelope & { status: number }) {
    super(message);
    this.code = code;
    this.details = details;
    this.traceId = traceId;
    this.status = status;
  }
}

// Unwrap `response.data` on success; convert failures into a typed ApiError.
apiClient.interceptors.response.use(
  (res) => res.data,
  (err: AxiosError<{ error?: ErrorEnvelope }>) => {
    if (err.response) {
      const body = err.response.data && err.response.data.error;
      if (body) {
        return Promise.reject(new ApiError({ ...body, status: err.response.status }));
      }
      return Promise.reject(
        new ApiError({
          code: 'HTTP_' + err.response.status,
          message: err.response.statusText || 'Request failed',
          status: err.response.status,
        }),
      );
    }
    return Promise.reject(new ApiError({ code: 'NETWORK_ERROR', message: err.message || 'Network error', status: 0 }));
  },
);
