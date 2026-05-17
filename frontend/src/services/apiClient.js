import axios from 'axios';

const runtimeBase = (typeof window !== 'undefined' && window.__APP_CONFIG__ && window.__APP_CONFIG__.apiBaseUrl) || '';
const envBase = import.meta.env.VITE_API_BASE_URL || '';
const baseURL = runtimeBase || envBase || '';

export const apiClient = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

apiClient.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export class ApiError extends Error {
  constructor({ code, message, details, traceId, status }) {
    super(message);
    this.code = code;
    this.details = details;
    this.traceId = traceId;
    this.status = status;
  }
}

apiClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response) {
      const body = err.response.data && err.response.data.error;
      if (body) {
        return Promise.reject(new ApiError({ ...body, status: err.response.status }));
      }
      return Promise.reject(new ApiError({
        code: 'HTTP_' + err.response.status,
        message: err.response.statusText || 'Request failed',
        status: err.response.status,
      }));
    }
    return Promise.reject(new ApiError({ code: 'NETWORK_ERROR', message: err.message || 'Network error', status: 0 }));
  }
);
