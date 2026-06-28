/**
 * Shared domain types mirroring the backend DTO records (package
 * `com.odoomaster.ticketing.dto`). Pages and the services layer import these so
 * field/contract drift between the API and the UI is caught at compile time.
 */

/** Pagination envelope returned by list endpoints. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/** Generic paginated response body. */
export interface Paginated<T> {
  data: T[];
  page?: PageMeta;
  counts?: Record<string, number>;
  countsByType?: Record<string, number>;
}

export type Role = 'ADMIN' | 'ORGANIZER' | 'USER' | string;

export interface User {
  id: number;
  email: string;
  fullName?: string;
  phone?: string;
  roles: Role[];
}

/** Auth endpoints return the issued token alongside the user. */
export interface AuthResult {
  token: string;
  user: User;
}

export interface Category {
  id?: number;
  name: string;
}

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | string;

export interface Section {
  name: string;
  price: number;
  seatCount: number;
  soldCount: number;
  rowCount: number;
}

export interface EventSummary {
  id: number;
  title: string;
  description?: string;
  location: string;
  organizer?: string;
  imageUrl?: string;
  startTime: string;
  endTime?: string;
  category?: string;
  categories?: Category[];
  priceFrom?: number;
  priceTo?: number;
  totalSeats?: number;
  availableSeats?: number;
  soldSeats?: number;
  revenue?: number;
  status?: EventStatus;
  sections?: Section[];
}

export type SeatStatus = 'AVAILABLE' | 'LOCKED' | 'SOLD' | string;

export interface Seat {
  id: number;
  section: string;
  rowLabel: string;
  seatNumber: string | number;
  price: number;
  status: SeatStatus;
  lockedUntil?: string | null;
}

export interface SeatMap {
  seats: Seat[];
}

export interface OrderItem {
  id: number;
  section: string;
  rowLabel: string;
  seatNumber: string | number;
  price: number;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | string;

export interface Order {
  id: number;
  eventId: number;
  eventTitle: string;
  status: OrderStatus;
  totalAmount: number;
  items: OrderItem[];
}

export type TicketStatus = 'VALID' | 'USED' | 'CANCELLED' | string;

export interface Ticket {
  id: number;
  eventTitle: string;
  eventLocation: string;
  eventStartTime: string;
  section: string;
  rowLabel: string;
  seatNumber: string | number;
  price: number;
  status: TicketStatus;
  qrCode: string;
  issuedAt: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  content?: string;
  channel: string;
  status: string;
  linkUrl?: string;
  sentAt?: string;
  createdAt: string;
  readAt?: string | null;
}

export interface Inbox {
  items: NotificationItem[];
  countsByType?: Record<string, number>;
  unreadCount?: number;
}

export interface Feedback {
  id: number;
  category: string;
  subject: string;
  body: string;
  rating?: number | null;
  status: string;
  adminNote?: string;
  userEmail: string;
  eventTitle?: string;
  createdAt: string;
}

export interface FeedbackSummary {
  total: number;
  newCount: number;
  resolvedCount: number;
  avgRating?: number | null;
}

/**
 * Admin analytics payload. Loosely typed on purpose — the dashboard renders many
 * nested aggregates; refine these as the report contract stabilises.
 */
export interface AnalyticsReport {
  kpis: {
    totalRevenue: number;
    ticketsSold: number;
    capacityFillRate: number;
    paymentSuccessRate: number;
    checkinRate: number;
    checkinCount: number;
  };
  revenueByDay: { date: string; revenue: number }[];
  paymentFunnel: {
    succeeded: number;
    pending: number;
    failed: number;
    refundPending: number;
    refunded: number;
  };
  categoryBreakdown: { category: string; eventCount: number }[];
  securitySignals: { code: string; label: string; count: number; severity: string }[];
  topEvents: {
    eventId: number;
    title: string;
    category: string;
    ticketsSold: number;
    revenue: number;
    checkinRate: number;
    status: string;
  }[];
}
