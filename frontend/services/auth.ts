import { post } from './http';
import type { AuthResult } from '@/types';

export const authApi = {
  register: (payload: Record<string, unknown>) => post<AuthResult>('/v1/auth/register', payload),
  login: (payload: { email: string; password: string }) => post<AuthResult>('/v1/auth/login', payload),
};
