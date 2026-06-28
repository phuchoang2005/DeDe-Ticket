import { apiClient } from './apiClient';
import type {
  AnalyticsReport,
  AuthResult,
  EventSummary,
  Feedback,
  FeedbackSummary,
  Inbox,
  Order,
  Paginated,
  SeatMap,
  Ticket,
  User,
} from '@/types';

/**
 * Thin typed wrappers around the axios instance. The response interceptor in
 * apiClient already unwraps `response.data`, so these helpers re-type the result
 * as the resolved body `T` rather than an `AxiosResponse`.
 */
const get = <T>(url: string, config?: object): Promise<T> =>
  apiClient.get(url, config) as unknown as Promise<T>;
const post = <T>(url: string, body?: unknown, config?: object): Promise<T> =>
  apiClient.post(url, body, config) as unknown as Promise<T>;
const put = <T>(url: string, body?: unknown): Promise<T> =>
  apiClient.put(url, body) as unknown as Promise<T>;
const patch = <T>(url: string, body?: unknown): Promise<T> =>
  apiClient.patch(url, body) as unknown as Promise<T>;
const del = <T>(url: string): Promise<T> => apiClient.delete(url) as unknown as Promise<T>;

export const authApi = {
  register: (payload: Record<string, unknown>) => post<AuthResult>('/v1/auth/register', payload),
  login: (payload: { email: string; password: string }) => post<AuthResult>('/v1/auth/login', payload),
};

export const userApi = {
  me: () => get<User>('/v1/users/me'),
  update: (payload: Record<string, unknown>) => put<User>('/v1/users/me', payload),
};

export const eventApi = {
  list: (params: Record<string, unknown> = {}) => get<Paginated<EventSummary>>('/v1/events', { params }),
  trending: (limit = 6) => get<EventSummary[]>('/v1/events/trending', { params: { limit } }),
  detail: (id: string | number) => get<EventSummary>(`/v1/events/${id}`),
  seats: (id: string | number) => get<SeatMap>(`/v1/events/${id}/seats`),
};

export const orderApi = {
  create: (payload: { eventId: number; seatIds: number[] }) => post<Order>('/v1/orders', payload),
  pay: (id: string | number, method: string) => post<Order>(`/v1/orders/${id}/pay`, { method }),
  list: () => get<Order[]>('/v1/orders'),
  get: (id: string | number) => get<Order>(`/v1/orders/${id}`),
  cancel: (id: string | number) => del<void>(`/v1/orders/${id}`),
};

export const ticketApi = {
  list: (params?: Record<string, unknown>) =>
    get<Paginated<Ticket>>('/v1/tickets', params ? { params } : undefined),
  get: (id: string | number) => get<Ticket>(`/v1/tickets/${id}`),
  delete: (id: string | number) => del<void>(`/v1/tickets/${id}`),
};

export const adminApi = {
  events: () => get<EventSummary[]>('/v1/admin/events'),
  event: (id: string | number) => get<EventSummary>(`/v1/admin/events/${id}`),
  createEvent: (payload: Record<string, unknown>) => post<EventSummary>('/v1/admin/events', payload),
  updateEvent: (id: string | number, payload: Record<string, unknown>) =>
    put<EventSummary>(`/v1/admin/events/${id}`, payload),
  changeStatus: (id: string | number, status: string) =>
    post<EventSummary>(`/v1/admin/events/${id}/status`, { status }),
  addSection: (id: string | number, payload: Record<string, unknown>) =>
    post<EventSummary>(`/v1/admin/events/${id}/sections`, payload),
  updateSection: (id: string | number, section: string, payload: Record<string, unknown>) =>
    put<EventSummary>(`/v1/admin/events/${id}/sections/${encodeURIComponent(section)}`, payload),
  deleteSection: (id: string | number, section: string) =>
    del<EventSummary>(`/v1/admin/events/${id}/sections/${encodeURIComponent(section)}`),
  deleteEvent: (id: string | number) => del<void>(`/v1/admin/events/${id}`),
};

export const analyticsApi = {
  report: (days = 14) => get<AnalyticsReport>('/v1/admin/analytics', { params: { days } }),
};

export const notificationApi = {
  inbox: (type?: string) => get<Inbox>('/v1/notifications', { params: type ? { type } : {} }),
  unreadCount: () => get<{ unreadCount: number }>('/v1/notifications/unread-count'),
  markRead: (id: string | number) => post<void>(`/v1/notifications/${id}/read`),
  markAllRead: () => post<void>('/v1/notifications/read-all'),
};

export const feedbackApi = {
  submit: (payload: Record<string, unknown>) => post<Feedback>('/v1/feedback', payload),
};

export const adminFeedbackApi = {
  list: (params: Record<string, unknown> = {}) => get<Paginated<Feedback>>('/v1/admin/feedback', { params }),
  summary: () => get<FeedbackSummary>('/v1/admin/feedback/summary'),
  updateStatus: (id: string | number, payload: Record<string, unknown>) =>
    patch<Feedback>(`/v1/admin/feedback/${id}/status`, payload),
};
