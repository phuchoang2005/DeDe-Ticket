import { get } from './http';
import type { EventSummary, Paginated, SeatMap } from '@/types';

export const eventApi = {
  list: (params: Record<string, unknown> = {}) => get<Paginated<EventSummary>>('/v1/events', { params }),
  trending: (limit = 6) => get<EventSummary[]>('/v1/events/trending', { params: { limit } }),
  detail: (id: string | number) => get<EventSummary>(`/v1/events/${id}`),
  seats: (id: string | number) => get<SeatMap>(`/v1/events/${id}/seats`),
};
