import { apiClient } from './apiClient';

// POST /v1/tickets/scan { qrCode, deviceId }. On success apiClient unwraps to the
// ScanResult body (eventTitle, section, rowLabel, seatNumber, checkedInAt,
// ticketId). On failure it rejects with an ApiError whose code is one of
// ALREADY_USED / TICKET_NOT_FOUND / TICKET_NOT_VALID (or a transport code).
export function scanTicket(qrCode, deviceId) {
  return apiClient.post('/v1/tickets/scan', { qrCode, deviceId });
}
