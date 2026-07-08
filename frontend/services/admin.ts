import { del, get, post, put } from './http';
import type { EventSummary } from '@/types';

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
