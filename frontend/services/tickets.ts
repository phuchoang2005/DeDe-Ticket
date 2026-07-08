import { del, get } from './http';
import type { Paginated, Ticket } from '@/types';

export const ticketApi = {
  list: (params?: Record<string, unknown>) => get<Paginated<Ticket>>('/v1/tickets', params ? { params } : undefined),
  get: (id: string | number) => get<Ticket>(`/v1/tickets/${id}`),
  delete: (id: string | number) => del<void>(`/v1/tickets/${id}`),
};
