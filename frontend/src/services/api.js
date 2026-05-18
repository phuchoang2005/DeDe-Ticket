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
  list: (params = {}) => apiClient.get('/v1/events', { params }),
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

export const adminApi = {
  events: () => apiClient.get('/v1/admin/events'),
  event: (id) => apiClient.get(`/v1/admin/events/${id}`),
  createEvent: (payload) => apiClient.post('/v1/admin/events', payload),
  updateEvent: (id, payload) => apiClient.put(`/v1/admin/events/${id}`, payload),
  changeStatus: (id, status) => apiClient.post(`/v1/admin/events/${id}/status`, { status }),
  addSection: (id, payload) => apiClient.post(`/v1/admin/events/${id}/sections`, payload),
  updateSection: (id, section, payload) =>
    apiClient.put(`/v1/admin/events/${id}/sections/${encodeURIComponent(section)}`, payload),
  deleteSection: (id, section) =>
    apiClient.delete(`/v1/admin/events/${id}/sections/${encodeURIComponent(section)}`),
  deleteEvent: (id) => apiClient.delete(`/v1/admin/events/${id}`),
};

export const analyticsApi = {
  report: (days = 14) => apiClient.get('/v1/admin/analytics', { params: { days } }),
};

export const notificationApi = {
  inbox: (type) => apiClient.get('/v1/notifications', { params: type ? { type } : {} }),
  unreadCount: () => apiClient.get('/v1/notifications/unread-count'),
  markRead: (id) => apiClient.post(`/v1/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/v1/notifications/read-all'),
};
