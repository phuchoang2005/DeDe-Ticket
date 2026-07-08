/**
 * Barrel re-exporting the per-domain API modules. Import call functions from
 * `@/services/api` (or, for a narrower dependency, from the specific domain
 * module such as `@/services/events`).
 */
export { authApi } from './auth';
export { userApi } from './users';
export { eventApi } from './events';
export { orderApi } from './orders';
export { ticketApi } from './tickets';
export { adminApi } from './admin';
export { analyticsApi } from './analytics';
export { notificationApi } from './notifications';
export { feedbackApi, adminFeedbackApi } from './feedback';
