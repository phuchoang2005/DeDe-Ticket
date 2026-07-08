import { del, get, post } from './http';
import type { Order } from '@/types';

export const orderApi = {
  create: (payload: { eventId: number; seatIds: number[] }) => post<Order>('/v1/orders', payload),
  pay: (id: string | number, method: string) => post<Order>(`/v1/orders/${id}/pay`, { method }),
  list: () => get<Order[]>('/v1/orders'),
  get: (id: string | number) => get<Order>(`/v1/orders/${id}`),
  cancel: (id: string | number) => del<void>(`/v1/orders/${id}`),
};
