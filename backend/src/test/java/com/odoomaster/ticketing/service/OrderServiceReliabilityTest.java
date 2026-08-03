package com.odoomaster.ticketing.service;
import com.odoomaster.ticketing.sales.OrderService;
import com.odoomaster.ticketing.notification.NotificationService;

import com.odoomaster.ticketing.catalog.Event;
import com.odoomaster.ticketing.catalog.EventSeat;
import com.odoomaster.ticketing.sales.Order;
import com.odoomaster.ticketing.sales.OrderItem;
import com.odoomaster.ticketing.ticketing.Ticket;
import com.odoomaster.ticketing.sales.OrderDtos.CreateOrderRequest;
import com.odoomaster.ticketing.sales.OrderDtos.PayRequest;
import com.odoomaster.ticketing.shared.exception.AppException;
import com.odoomaster.ticketing.catalog.EventRepository;
import com.odoomaster.ticketing.catalog.EventSeatRepository;
import com.odoomaster.ticketing.sales.OrderItemRepository;
import com.odoomaster.ticketing.sales.OrderRepository;
import com.odoomaster.ticketing.sales.PaymentRepository;
import com.odoomaster.ticketing.ticketing.TicketRepository;
import com.odoomaster.ticketing.shared.event.TicketsIssuedEvent;
import com.odoomaster.ticketing.notification.NotificationEventListener;
import com.odoomaster.ticketing.sales.payment.MockPaymentGateway;
import com.odoomaster.ticketing.sales.payment.PaymentGatewayResolver;
import org.springframework.context.ApplicationEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceReliabilityTest {

    @Mock EventRepository events;
    @Mock EventSeatRepository seats;
    @Mock OrderRepository orders;
    @Mock OrderItemRepository orderItems;
    @Mock PaymentRepository payments;
    @Mock TicketRepository tickets;
    @Mock NotificationService notificationService;

    OrderService service;

    @BeforeEach
    void setUp() {
        // Wire the Observer end-to-end: route published TicketsIssuedEvents to a real listener
        // backed by the mocked NotificationService, so notification assertions still hold.
        NotificationEventListener listener = new NotificationEventListener(notificationService);
        ApplicationEventPublisher publisher = event -> {
            if (event instanceof TicketsIssuedEvent e) listener.onTicketsIssued(e);
        };
        PaymentGatewayResolver resolver = new PaymentGatewayResolver(List.of(new MockPaymentGateway()));
        service = new OrderService(events, seats, orders, orderItems, payments, tickets, resolver, publisher);
    }

    @Test
    void create_givenPublishedEventAndAvailableSeats_locksSeatsAndTotalsOrder() {
        Event event = event("PUBLISHED");
        EventSeat a1 = seat(10L, "AVAILABLE", BigDecimal.valueOf(100_000));
        EventSeat a2 = seat(11L, "AVAILABLE", BigDecimal.valueOf(150_000));
        when(events.findById(1L)).thenReturn(Optional.of(event));
        when(seats.findByIdIn(List.of(10L, 11L))).thenReturn(List.of(a1, a2));
        when(orders.save(any())).thenAnswer(inv -> {
            Order order = inv.getArgument(0);
            order.setId(77L);
            return order;
        });
        when(orderItems.saveAll(anyList())).thenAnswer(inv -> {
            List<OrderItem> rows = inv.getArgument(0);
            long id = 1L;
            for (OrderItem row : rows) row.setId(id++);
            return rows;
        });

        var view = service.create(5L, new CreateOrderRequest(1L, List.of(10L, 11L)));

        assertThat(view.id()).isEqualTo(77L);
        assertThat(view.totalAmount()).isEqualByComparingTo("250000");
        assertThat(view.items()).hasSize(2);
        assertThat(a1.getStatus()).isEqualTo("LOCKED");
        assertThat(a1.getLockedBy()).isEqualTo(5L);
        assertThat(a1.getLockedUntil()).isAfter(Instant.now());
        assertThat(a2.getStatus()).isEqualTo("LOCKED");
        verify(seats).saveAll(List.of(a1, a2));
    }

    @Test
    void create_givenExpiredLock_relocksSeatForCurrentUser() {
        EventSeat seat = seat(10L, "LOCKED", BigDecimal.TEN);
        seat.setLockedBy(44L);
        seat.setLockedUntil(Instant.now().minusSeconds(1));
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));
        when(seats.findByIdIn(List.of(10L))).thenReturn(List.of(seat));
        when(orders.save(any())).thenAnswer(inv -> {
            Order order = inv.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItems.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        service.create(9L, new CreateOrderRequest(1L, List.of(10L)));

        assertThat(seat.getStatus()).isEqualTo("LOCKED");
        assertThat(seat.getLockedBy()).isEqualTo(9L);
        assertThat(seat.getLockedUntil()).isAfter(Instant.now());
    }

    @ParameterizedTest
    @ValueSource(strings = {"DRAFT", "CANCELLED", "ARCHIVED"})
    void create_givenEventNotPublished_rejectsSale(String status) {
        when(events.findById(1L)).thenReturn(Optional.of(event(status)));

        assertThatThrownBy(() -> service.create(5L, new CreateOrderRequest(1L, List.of(10L))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("not currently on sale");
    }

    @ParameterizedTest
    @CsvSource({
            "SOLD,false",
            "BOOKED,false",
            "LOCKED,false",
            "HELD,false"
    })
    void create_givenUnavailableSeat_rejectsContention(String status, boolean expired) {
        EventSeat selected = seat(10L, status, BigDecimal.TEN);
        selected.setLockedUntil(expired ? Instant.now().minusSeconds(1) : Instant.now().plusSeconds(60));
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));
        when(seats.findByIdIn(List.of(10L))).thenReturn(List.of(selected));

        assertThatThrownBy(() -> service.create(5L, new CreateOrderRequest(1L, List.of(10L))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("no longer available");
        verify(orders, never()).save(any());
    }

    @Test
    void create_givenDuplicateSeatIds_rejectsBeforeLocking() {
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));

        assertThatThrownBy(() -> service.create(5L, new CreateOrderRequest(1L, List.of(10L, 10L))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Duplicate seats");
        verify(seats, never()).saveAll(any());
    }

    @ParameterizedTest
    @CsvSource({
            "0,At least one seat",
            "1,One or more seats"
    })
    void create_givenMissingSeatInput_rejectsReliably(int mode, String message) {
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));
        List<Long> requested = mode == 0 ? List.of() : List.of(404L);
        if (mode == 1) when(seats.findByIdIn(requested)).thenReturn(List.of());

        assertThatThrownBy(() -> service.create(5L, new CreateOrderRequest(1L, requested)))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(message);
    }

    @Test
    void create_givenSeatFromDifferentEvent_rejectsCrossEventLock() {
        EventSeat selected = seat(10L, "AVAILABLE", BigDecimal.TEN);
        selected.setEventId(2L);
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));
        when(seats.findByIdIn(List.of(10L))).thenReturn(List.of(selected));

        assertThatThrownBy(() -> service.create(5L, new CreateOrderRequest(1L, List.of(10L))))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("not in this event");
    }

    @Test
    void pay_givenPendingOrder_sellsSeatsCreatesTicketsAndNotification() {
        Order order = order(20L, "PENDING", 5L);
        OrderItem item = item(30L, 10L);
        EventSeat selected = seat(10L, "LOCKED", BigDecimal.valueOf(120_000));
        selected.setLockedUntil(Instant.now().plusSeconds(60));
        when(orders.findById(20L)).thenReturn(Optional.of(order));
        when(orderItems.findByOrderId(20L)).thenReturn(List.of(item));
        when(seats.findByIdIn(List.of(10L))).thenReturn(List.of(selected));
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));

        service.pay(5L, 20L, new PayRequest("MOCK"));

        assertThat(order.getStatus()).isEqualTo("PAID");
        assertThat(order.getPaidAt()).isNotNull();
        assertThat(selected.getStatus()).isEqualTo("SOLD");
        assertThat(selected.getLockedBy()).isNull();
        verify(payments).save(any());
        verify(tickets).save(any(Ticket.class));
        verify(notificationService).create(5L, "TICKETS_ISSUED", "Vé của bạn đã được phát hành",
                "Sự kiện: Reliability event. Đơn hàng #20 đã thanh toán thành công qua MOCK.",
                "IN_APP", "/tickets");
    }

    @ParameterizedTest
    @CsvSource({
            "CANCELLED,Order cannot be paid",
            "REFUND_PENDING,Order cannot be paid",
            "EXPIRED,Order cannot be paid"
    })
    void pay_givenInvalidOrderState_rejectsPayment(String status, String message) {
        when(orders.findById(20L)).thenReturn(Optional.of(order(20L, status, 5L)));

        assertThatThrownBy(() -> service.pay(5L, 20L, new PayRequest("MOCK")))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(message);
    }

    @Test
    void pay_givenAlreadyPaidOrder_isIdempotentAndDoesNotIssueNewTicket() {
        Order paid = order(20L, "PAID", 5L);
        when(orders.findById(20L)).thenReturn(Optional.of(paid));
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));
        when(orderItems.findByOrderId(20L)).thenReturn(List.of());
        when(seats.findByIdIn(List.of())).thenReturn(List.of());

        service.pay(5L, 20L, new PayRequest("MOCK"));

        verify(tickets, never()).save(any());
        verify(payments, never()).save(any());
    }

    @ParameterizedTest
    @CsvSource({
            "SOLD,Seat already sold",
            "LOCKED,Seat lock expired"
    })
    void pay_givenSeatUnavailableAtPayment_rejectsBeforeTicketIssuance(String status, String message) {
        Order order = order(20L, "PENDING", 5L);
        EventSeat selected = seat(10L, status, BigDecimal.TEN);
        selected.setLockedUntil(Instant.now().minusSeconds(5));
        when(orders.findById(20L)).thenReturn(Optional.of(order));
        when(orderItems.findByOrderId(20L)).thenReturn(List.of(item(30L, 10L)));
        when(seats.findByIdIn(List.of(10L))).thenReturn(List.of(selected));

        assertThatThrownBy(() -> service.pay(5L, 20L, new PayRequest("MOCK")))
                .isInstanceOf(AppException.class)
                .hasMessageContaining(message);
        verify(tickets, never()).save(any());
    }

    @Test
    void pay_concurrentDistinctOrders_generatesUniqueQrCodes() throws Exception {
        int count = 40;
        Set<String> qrCodes = ConcurrentHashMap.newKeySet();
        when(orders.findById(anyLong())).thenAnswer(inv -> {
            Long orderId = inv.getArgument(0);
            return Optional.of(order(orderId, "PENDING", 5L));
        });
        when(orderItems.findByOrderId(anyLong())).thenAnswer(inv -> {
            Long orderId = inv.getArgument(0);
            return List.of(item(orderId * 10, orderId * 100));
        });
        when(seats.findByIdIn(anyList())).thenAnswer(inv -> {
            List<Long> ids = inv.getArgument(0);
            return ids.stream().map(id -> {
                EventSeat selected = seat(id, "LOCKED", BigDecimal.TEN);
                selected.setLockedUntil(Instant.now().plusSeconds(60));
                return selected;
            }).toList();
        });
        when(tickets.save(any())).thenAnswer(inv -> {
            Ticket ticket = inv.getArgument(0);
            qrCodes.add(ticket.getQrCode());
            return ticket;
        });
        lenient().when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));
        lenient().when(payments.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var pool = Executors.newFixedThreadPool(8);
        CountDownLatch start = new CountDownLatch(1);
        List<Callable<Void>> tasks = new ArrayList<>();
        for (long i = 1; i <= count; i++) {
            long orderId = i;
            tasks.add(() -> {
                start.await(2, TimeUnit.SECONDS);
                service.pay(5L, orderId, new PayRequest("MOCK"));
                return null;
            });
        }

        var futures = tasks.stream().map(pool::submit).toList();
        start.countDown();
        for (var future : futures) future.get(5, TimeUnit.SECONDS);
        pool.shutdownNow();

        assertThat(qrCodes).hasSize(count);
        assertThat(qrCodes).allMatch(qr -> qr.length() == 32 && qr.matches("[0-9A-F]+"));
    }

    @Test
    void cancel_givenPendingOrder_releasesLockedSeatsAndDeletesItems() {
        Order order = order(20L, "PENDING", 5L);
        EventSeat locked = seat(10L, "LOCKED", BigDecimal.TEN);
        locked.setLockedBy(5L);
        locked.setLockedUntil(Instant.now().plusSeconds(60));
        when(orders.findById(20L)).thenReturn(Optional.of(order));
        when(orderItems.findByOrderId(20L)).thenReturn(List.of(item(30L, 10L)));
        when(seats.findByIdIn(List.of(10L))).thenReturn(List.of(locked));

        service.cancel(5L, 20L);

        assertThat(order.getStatus()).isEqualTo("CANCELLED");
        assertThat(locked.getStatus()).isEqualTo("AVAILABLE");
        assertThat(locked.getLockedBy()).isNull();
        verify(orderItems).deleteAll(anyList());
    }

    @ParameterizedTest
    @CsvSource({
            "PAID,Cannot cancel a paid order",
            "CANCELLED,"
    })
    void cancel_givenTerminalState_handlesSafely(String status, String message) {
        when(orders.findById(20L)).thenReturn(Optional.of(order(20L, status, 5L)));

        if ("CANCELLED".equals(status)) {
            service.cancel(5L, 20L);
            verify(seats, never()).saveAll(any());
        } else {
            assertThatThrownBy(() -> service.cancel(5L, 20L))
                    .isInstanceOf(AppException.class)
                    .hasMessageContaining(message);
        }
    }

    @Test
    void getMine_givenOrderOwnedByAnotherUser_rejectsAccess() {
        when(orders.findById(20L)).thenReturn(Optional.of(order(20L, "PENDING", 99L)));

        assertThatThrownBy(() -> service.getMine(5L, 20L))
                .isInstanceOf(AppException.class)
                .extracting("status")
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void listMine_returnsOrdersInRepositoryOrder() {
        when(orders.findByUserIdOrderByCreatedAtDesc(5L)).thenReturn(List.of(order(2L, "PENDING", 5L), order(1L, "PAID", 5L)));
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));
        when(orderItems.findByOrderId(anyLong())).thenReturn(List.of());
        when(seats.findByIdIn(List.of())).thenReturn(List.of());

        assertThat(service.listMine(5L)).extracting("id").containsExactly(2L, 1L);
    }

    @Test
    void pay_capturesTicketShapeForIssuedSeat() {
        Order order = order(20L, "PENDING", 5L);
        OrderItem item = item(30L, 10L);
        EventSeat selected = seat(10L, "LOCKED", BigDecimal.TEN);
        selected.setLockedUntil(Instant.now().plusSeconds(60));
        when(orders.findById(20L)).thenReturn(Optional.of(order));
        when(orderItems.findByOrderId(20L)).thenReturn(List.of(item));
        when(seats.findByIdIn(List.of(10L))).thenReturn(List.of(selected));
        when(events.findById(1L)).thenReturn(Optional.of(event("PUBLISHED")));

        service.pay(5L, 20L, new PayRequest("VNPAY"));

        ArgumentCaptor<Ticket> ticket = ArgumentCaptor.forClass(Ticket.class);
        verify(tickets).save(ticket.capture());
        assertThat(ticket.getValue().getOrderItemId()).isEqualTo(30L);
        assertThat(ticket.getValue().getUserId()).isEqualTo(5L);
        assertThat(ticket.getValue().getEventSeatId()).isEqualTo(10L);
        assertThat(ticket.getValue().getQrCode()).hasSize(32);
        assertThat(ticket.getValue().getStatus()).isEqualTo("VALID");
    }

    private static Event event(String status) {
        Event event = new Event();
        event.setId(1L);
        event.setTitle("Reliability event");
        event.setStatus(status);
        event.setStartTime(Instant.now().plusSeconds(3600));
        event.setEndTime(Instant.now().plusSeconds(7200));
        return event;
    }

    private static EventSeat seat(Long id, String status, BigDecimal price) {
        EventSeat seat = new EventSeat();
        seat.setId(id);
        seat.setEventId(1L);
        seat.setSeatId(id);
        seat.setTicketTypeId(3L);
        seat.setRowLabel("A");
        seat.setSeatNumber(String.valueOf(id));
        seat.setSection("MAIN");
        seat.setPrice(price);
        seat.setStatus(status);
        seat.setVersion(0);
        return seat;
    }

    private static Order order(Long id, String status, Long userId) {
        Order order = new Order();
        order.setId(id);
        order.setUserId(userId);
        order.setEventId(1L);
        order.setTotalAmount(BigDecimal.TEN);
        order.setStatus(status);
        order.setCreatedAt(Instant.now());
        return order;
    }

    private static OrderItem item(Long id, Long eventSeatId) {
        OrderItem item = new OrderItem();
        item.setId(id);
        item.setOrderId(20L);
        item.setEventSeatId(eventSeatId);
        item.setTicketTypeId(3L);
        item.setPrice(BigDecimal.TEN);
        return item;
    }
}
