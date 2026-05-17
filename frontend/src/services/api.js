import { apiClient } from './apiClient';

export const authApi = {
  register: (payload) => apiClient.post('/v1/auth/register', payload),
  login: (payload) => apiClient.post('/v1/auth/login', payload),
};

export const userApi = {
  me: () => apiClient.get('/v1/users/me'),
  update: (payload) => apiClient.put('/v1/users/me', payload),
};

export const eventApi = {
  list: () => apiClient.get('/v1/events'),
  detail: (id) => apiClient.get(`/v1/events/${id}`),
  seats: (id) => apiClient.get(`/v1/events/${id}/seats`),
};

export const orderApi = {
  create: (payload) => apiClient.post('/v1/orders', payload),
  pay: (id, method) => apiClient.post(`/v1/orders/${id}/pay`, { method }),
  list: () => apiClient.get('/v1/orders'),
  get: (id) => apiClient.get(`/v1/orders/${id}`),
};

export const ticketApi = {
  list: () => apiClient.get('/v1/tickets'),
  get: (id) => apiClient.get(`/v1/tickets/${id}`),
};

export const notificationApi = {
  inbox: (type) => apiClient.get('/v1/notifications', { params: type ? { type } : {} }),
  unreadCount: () => apiClient.get('/v1/notifications/unread-count'),
  markRead: (id) => apiClient.post(`/v1/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/v1/notifications/read-all'),
};
