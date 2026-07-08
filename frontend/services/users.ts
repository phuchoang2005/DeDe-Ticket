import { get, put } from './http';
import type { User } from '@/types';

export const userApi = {
  me: () => get<User>('/v1/users/me'),
  update: (payload: Record<string, unknown>) => put<User>('/v1/users/me', payload),
};
