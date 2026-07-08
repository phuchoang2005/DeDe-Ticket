import { get, patch, post } from './http';
import type { Feedback, FeedbackSummary, Paginated } from '@/types';

export const feedbackApi = {
  submit: (payload: Record<string, unknown>) => post<Feedback>('/v1/feedback', payload),
};

export const adminFeedbackApi = {
  list: (params: Record<string, unknown> = {}) => get<Paginated<Feedback>>('/v1/admin/feedback', { params }),
  summary: () => get<FeedbackSummary>('/v1/admin/feedback/summary'),
  updateStatus: (id: string | number, payload: Record<string, unknown>) =>
    patch<Feedback>(`/v1/admin/feedback/${id}/status`, payload),
};
