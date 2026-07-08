import { apiClient } from './apiClient';

/**
 * Thin typed wrappers around the axios instance. The response interceptor in
 * apiClient already unwraps `response.data`, so these helpers re-type the result
 * as the resolved body `T` rather than an `AxiosResponse`.
 */
export const get = <T>(url: string, config?: object): Promise<T> => apiClient.get(url, config) as unknown as Promise<T>;
export const post = <T>(url: string, body?: unknown, config?: object): Promise<T> =>
  apiClient.post(url, body, config) as unknown as Promise<T>;
export const put = <T>(url: string, body?: unknown): Promise<T> => apiClient.put(url, body) as unknown as Promise<T>;
export const patch = <T>(url: string, body?: unknown): Promise<T> =>
  apiClient.patch(url, body) as unknown as Promise<T>;
export const del = <T>(url: string): Promise<T> => apiClient.delete(url) as unknown as Promise<T>;
