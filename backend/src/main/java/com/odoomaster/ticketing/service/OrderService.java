package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.audit.Auditable;
import com.odoomaster.ticketing.config.CacheConfig;
import com.odoomaster.ticketing.domain.*;
import com.odoomaster.ticketing.dto.OrderDtos.*;
import com.odoomaster.ticketing.event.TicketsIssuedEvent;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.*;
import com.odoomaster.ticketing.service.payment.PaymentGateway;
import com.odoomaster.ticketing.service.payment.PaymentGatewayResolver;
import com.odoomaster.ticketing.service.payment.PaymentRequest;
import com.odoomaster.ticketing.service.payment.PaymentResult;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Core ordering service and the concurrency crux of the system.
 *
 * <p>Holds selected seats with a DB-level lock for {@value #LOCK_TTL_MINUTES} minutes when an
 * order is created, transitions them through {@code AVAILABLE → LOCKED → SOLD} (or back to
 * {@code AVAILABLE} on cancel/expiry), and issues QR tickets on payment. Every mutating method is
 * {@code @Transactional} and evicts the event caches so seat availability is never read stale.
 *
 * <p>Payment is delegated to a {@link PaymentGateway} chosen by {@link PaymentGatewayResolver}
 * (Strategy + Factory), and ticket issuance fires a {@link TicketsIssuedEvent} that
 * {@code NotificationEventListener} observes — keeping payment and notification concerns out of
 * this class.
 */
@Service
public class OrderService {

    /** How long, in minutes, a created order holds its seats before the sweeper may release them. */
    private static final int LOCK_TTL_MINUTES = 10;

    private final EventRepository events;
    private final EventSeatRepository seats;
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final PaymentRepository payments;
    private final TicketRepository tickets;

    private final PaymentGatewayResolver paymentGatewayResolver;
    private final ApplicationEventPublisher eventPublisher;

    public OrderService(EventRepository events, EventSeatRepository seats,
                        OrderRepository orders, OrderItemRepository orderItems,
                        PaymentRepository payments, TicketRepository tickets,
                        PaymentGatewayResolver paymentGatewayResolver,
                        ApplicationEventPublisher eventPublisher) {
        this.events = events;
        this.seats = seats;
        this.orders = orders;
        this.orderItems = orderItems;
        this.payments = payments;
        this.tickets = tickets;
        this.paymentGatewayResolver = paymentGatewayResolver;
        this.eventPublisher = eventPublisher;
    }

    /**
     * Create a PENDING order and hold its seats for {@value #LOCK_TTL_MINUTES} minutes.
     *
     * <p>Validates the event is on sale and the seats are unique, available (or holding an expired
     * lock), and belong to the event, then transitions each seat to {@code LOCKED} with
     * {@code lockedBy}/{@code lockedUntil} set. Runs in one transaction and evicts the seat/detail
     * caches for the event so availability is re-read fresh.
     *
     * @param userId the buyer holding the seats
     * @param req the event id and requested seat ids
     * @return a view of the created order with its line items
     * @throws AppException if the event is missing/not published, seats are duplicated/missing,
     *                      cross-event, or already taken
     */
    @Transactional
    @Auditable(action = "ORDER_CREATED", entity = "orders")
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENT_SEATS, key = "#req.eventId()"),
            @CacheEvict(value = CacheConfig.EVENT_DETAIL, key = "#req.eventId()"),
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true)
    })
    public OrderView create(Long userId, CreateOrderRequest req) {
        Event event = events.findById(req.eventId())
                .orElseThrow(() -> new AppException("EVENT_NOT_FOUND", "Event not found.", HttpStatus.NOT_FOUND));
        if (!"PUBLISHED".equals(event.getStatus())) {
            throw new AppException("EVENT_NOT_PUBLISHED",
                    "Event is not currently on sale.", HttpStatus.CONFLICT);
        }
        if (req.seatIds() == null || req.seatIds().isEmpty()) {
            throw new AppException("VALIDATION_FAILED", "At least one seat is required.", HttpStatus.BAD_REQUEST);
        }
        Set<Long> unique = new HashSet<>(req.seatIds());
        if (unique.size() != req.seatIds().size()) {
            throw new AppException("DUPLICATE_SEATS", "Duplicate seats in request.", HttpStatus.BAD_REQUEST);
        }

        List<EventSeat> picked = seats.findByIdIn(req.seatIds());
        if (picked.size() != req.seatIds().size()) {
            throw new AppException("SEAT_NOT_FOUND", "One or more seats not found.", HttpStatus.NOT_FOUND);
        }

        Instant now = Instant.now();
        Instant lockUntil = now.plus(LOCK_TTL_MINUTES, ChronoUnit.MINUTES);
        BigDecimal total = BigDecimal.ZERO;

        for (EventSeat s : picked) {
            if (!Objects.equals(s.getEventId(), event.getId())) {
                throw new AppException("SEAT_NOT_IN_EVENT", "Seat " + s.getId() + " is not in this event.", HttpStatus.BAD_REQUEST);
            }
            boolean lockExpired = s.getLockedUntil() != null && s.getLockedUntil().isBefore(now);
            if (!"AVAILABLE".equals(s.getStatus()) && !(("LOCKED".equals(s.getStatus()) && lockExpired))) {
                throw new AppException("SEAT_TAKEN", "Seat " + s.getRowLabel() + "-" + s.getSeatNumber() + " is no longer available.", HttpStatus.CONFLICT);
            }
            s.setStatus("LOCKED");
            s.setLockedBy(userId);
            s.setLockedUntil(lockUntil);
            total = total.add(s.getPrice());
        }
        seats.saveAll(picked);

        Order order = Order.builder()
                .userId(userId)
                .eventId(event.getId())
                .totalAmount(total)
                .status("PENDING")
                .build();
        orders.save(order);

        List<OrderItem> items = new ArrayList<>();
        for (EventSeat s : picked) {
            items.add(OrderItem.builder()
                    .orderId(order.getId())
                    .eventSeatId(s.getId())
                    .ticketTypeId(s.getTicketTypeId())
                    .price(s.getPrice())
                    .build());
        }
        orderItems.saveAll(items);

        return toView(order, event, items, picked);
    }

    /**
     * Pay a PENDING order: charge the gateway, mark its seats {@code SOLD}, issue QR tickets and
     * publish a {@link TicketsIssuedEvent}.
     *
     * <p>Idempotent for an already-PAID order (returns the existing view without re-issuing). Seats
     * are re-checked at payment time and rejected if sold elsewhere or their lock expired. The whole
     * method is transactional and evicts all event caches.
     *
     * @param userId the paying user (must own the order)
     * @param orderId the order to pay
     * @param req the chosen payment method/provider
     * @return a view of the paid order
     * @throws AppException if the order is missing, not owned by the user, in an unpayable state,
     *                      or a seat is no longer holdable
     */
    @Transactional
    @Auditable(action = "ORDER_PAID", entity = "orders")
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENT_SEATS, allEntries = true),
            @CacheEvict(value = CacheConfig.EVENT_DETAIL, allEntries = true),
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true)
    })
    public OrderView pay(Long userId, Long orderId, PayRequest req) {
        Order order = orders.findById(orderId)
                .orElseThrow(() -> new AppException("ORDER_NOT_FOUND", "Order not found.", HttpStatus.NOT_FOUND));
        if (!Objects.equals(order.getUserId(), userId)) {
            throw new AppException("FORBIDDEN", "Order does not belong to current user.", HttpStatus.FORBIDDEN);
        }
        if ("PAID".equals(order.getStatus())) {
            return view(order);
        }
        if (!"PENDING".equals(order.getStatus())) {
            throw new AppException("ORDER_STATE_INVALID", "Order cannot be paid in state " + order.getStatus(), HttpStatus.CONFLICT);
        }

        List<OrderItem> items = orderItems.findByOrderId(order.getId());
        List<Long> seatIds = items.stream().map(OrderItem::getEventSeatId).toList();
        List<EventSeat> picked = seats.findByIdIn(seatIds);

        Instant now = Instant.now();
        for (EventSeat s : picked) {
            if ("SOLD".equals(s.getStatus())) {
                throw new AppException("SEAT_TAKEN", "Seat already sold.", HttpStatus.CONFLICT);
            }
            if (s.getLockedUntil() != null && s.getLockedUntil().isBefore(now) && !"AVAILABLE".equals(s.getStatus())) {
                throw new AppException("LOCK_EXPIRED", "Seat lock expired; please re-select seats.", HttpStatus.CONFLICT);
            }
            s.setStatus("SOLD");
            s.setLockedBy(null);
            s.setLockedUntil(null);
        }
        seats.saveAll(picked);

        // Charge via the resolved payment gateway (Strategy). The mock gateway always succeeds.
        PaymentGateway gateway = paymentGatewayResolver.resolve(req.method());
        PaymentResult result = gateway.charge(new PaymentRequest(order.getId(), req.method(), order.getTotalAmount()));
        Payment p = Payment.builder()
                .orderId(order.getId())
                .provider(req.method())
                .transactionId(result.transactionId())
                .amount(order.getTotalAmount())
                .status(result.status())
                .build();
        payments.save(p);

        order.setStatus("PAID");
        order.setPaymentMethod(req.method());
        order.setPaidAt(now);
        orders.save(order);

        int ticketCount = 0;
        for (OrderItem item : items) {
            EventSeat s = picked.stream().filter(x -> Objects.equals(x.getId(), item.getEventSeatId())).findFirst().orElseThrow();
            Ticket t = Ticket.builder()
                    .orderItemId(item.getId())
                    .userId(userId)
                    .eventId(order.getEventId())
                    .eventSeatId(s.getId())
                    .qrCode(UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT))
                    .status("VALID")
                    .build();
            tickets.save(t);
            ticketCount++;
        }

        // Publish the tickets-issued event (Observer); NotificationEventListener creates the
        // in-app notification. Runs synchronously within this transaction.
        Event ev = events.findById(order.getEventId()).orElse(null);
        eventPublisher.publishEvent(new TicketsIssuedEvent(
                userId, order.getId(), ev != null ? ev.getTitle() : null, ticketCount, req.method()));

        return view(order);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = CacheConfig.EVENT_SEATS, allEntries = true),
            @CacheEvict(value = CacheConfig.EVENT_DETAIL, allEntries = true),
            @CacheEvict(value = CacheConfig.EVENTS_LIST, allEntries = true)
    })
    public void cancel(Long userId, Long orderId) {
        Order order = orders.findById(orderId)
                .orElseThrow(() -> new AppException("ORDER_NOT_FOUND", "Order not found.", HttpStatus.NOT_FOUND));
        if (!Objects.equals(order.getUserId(), userId)) {
            throw new AppException("FORBIDDEN", "Order does not belong to current user.", HttpStatus.FORBIDDEN);
        }
        if ("PAID".equals(order.getStatus())) {
            throw new AppException("ORDER_ALREADY_PAID", "Cannot cancel a paid order.", HttpStatus.CONFLICT);
        }
        if ("CANCELLED".equals(order.getStatus())) return;

        List<OrderItem> items = orderItems.findByOrderId(order.getId());
        List<Long> seatIds = items.stream().map(OrderItem::getEventSeatId).toList();
        List<EventSeat> picked = seats.findByIdIn(seatIds);
        for (EventSeat s : picked) {
            if ("LOCKED".equals(s.getStatus())) {
                s.setStatus("AVAILABLE");
                s.setLockedBy(null);
                s.setLockedUntil(null);
            }
        }
        seats.saveAll(picked);
        orderItems.deleteAll(items);
        order.setStatus("CANCELLED");
        orders.save(order);
    }

    @Transactional(readOnly = true)
    public List<OrderView> listMine(Long userId) {
        return orders.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public OrderView getMine(Long userId, Long orderId) {
        Order o = orders.findById(orderId)
                .orElseThrow(() -> new AppException("ORDER_NOT_FOUND", "Order not found.", HttpStatus.NOT_FOUND));
        if (!Objects.equals(o.getUserId(), userId)) {
            throw new AppException("FORBIDDEN", "Order does not belong to current user.", HttpStatus.FORBIDDEN);
        }
        return view(o);
    }

    private OrderView view(Order order) {
        Event ev = events.findById(order.getEventId()).orElse(null);
        List<OrderItem> items = orderItems.findByOrderId(order.getId());
        List<EventSeat> picked = seats.findByIdIn(items.stream().map(OrderItem::getEventSeatId).toList());
        return toView(order, ev, items, picked);
    }

    private OrderView toView(Order order, Event event, List<OrderItem> items, List<EventSeat> picked) {
        Map<Long, EventSeat> byId = new HashMap<>();
        for (EventSeat s : picked) byId.put(s.getId(), s);
        List<OrderItemView> rows = items.stream().map(it -> {
            EventSeat s = byId.get(it.getEventSeatId());
            return new OrderItemView(it.getId(), it.getEventSeatId(),
                    s != null ? s.getRowLabel() : null,
                    s != null ? s.getSeatNumber() : null,
                    s != null ? s.getSection() : null,
                    it.getPrice());
        }).toList();
        return new OrderView(order.getId(), order.getEventId(),
                event != null ? event.getTitle() : null,
                order.getStatus(), order.getPaymentMethod(),
                order.getTotalAmount(), order.getCreatedAt(), order.getPaidAt(), rows);
    }
}
