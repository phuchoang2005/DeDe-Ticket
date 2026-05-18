package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.config.CacheConfig;
import com.odoomaster.ticketing.domain.*;
import com.odoomaster.ticketing.dto.OrderDtos.*;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.*;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class OrderService {

    private static final int LOCK_TTL_MINUTES = 10;

    private final EventRepository events;
    private final EventSeatRepository seats;
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final PaymentRepository payments;
    private final TicketRepository tickets;

    private final NotificationService notificationService;

    public OrderService(EventRepository events, EventSeatRepository seats,
                        OrderRepository orders, OrderItemRepository orderItems,
                        PaymentRepository payments, TicketRepository tickets,
                        NotificationService notificationService) {
        this.events = events;
        this.seats = seats;
        this.orders = orders;
        this.orderItems = orderItems;
        this.payments = payments;
        this.tickets = tickets;
        this.notificationService = notificationService;
    }

    @Transactional
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
                    .price(s.getPrice())
                    .build());
        }
        orderItems.saveAll(items);

        return toView(order, event, items, picked);
    }

    @Transactional
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

        // Mock payment: auto-success
        Payment p = Payment.builder()
                .orderId(order.getId())
                .provider(req.method())
                .transactionId("MOCK-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase(Locale.ROOT))
                .amount(order.getTotalAmount())
                .status("SUCCEEDED")
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

        Event ev = events.findById(order.getEventId()).orElse(null);
        String title = ticketCount == 1 ? "Vé của bạn đã được phát hành" : ticketCount + " vé của bạn đã được phát hành";
        String content = (ev != null ? "Sự kiện: " + ev.getTitle() + "." : "")
                + " Đơn hàng #" + order.getId() + " đã thanh toán thành công qua " + req.method() + ".";
        notificationService.create(userId, "TICKETS_ISSUED", title, content, "IN_APP", "/tickets");

        return view(order);
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
