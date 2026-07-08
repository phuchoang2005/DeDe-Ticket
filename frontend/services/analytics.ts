import { get } from './http';
import type { AnalyticsReport } from '@/types';

export const analyticsApi = {
  report: (days = 14) => get<AnalyticsReport>('/v1/admin/analytics', { params: { days } }),
};
