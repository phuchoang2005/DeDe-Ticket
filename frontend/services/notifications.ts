import { get, post } from './http';
import type { Inbox } from '@/types';

export const notificationApi = {
  inbox: (type?: string) => get<Inbox>('/v1/notifications', { params: type ? { type } : {} }),
  unreadCount: () => get<{ unreadCount: number }>('/v1/notifications/unread-count'),
  markRead: (id: string | number) => post<void>(`/v1/notifications/${id}/read`),
  markAllRead: () => post<void>('/v1/notifications/read-all'),
};
