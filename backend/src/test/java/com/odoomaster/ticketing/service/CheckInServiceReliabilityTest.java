package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.domain.Event;
import com.odoomaster.ticketing.domain.EventSeat;
import com.odoomaster.ticketing.domain.Ticket;
import com.odoomaster.ticketing.dto.TicketDtos.ScanRequest;
import com.odoomaster.ticketing.shared.exception.AppException;
import com.odoomaster.ticketing.repository.CheckInRepository;
import com.odoomaster.ticketing.repository.EventRepository;
import com.odoomaster.ticketing.repository.EventSeatRepository;
import com.odoomaster.ticketing.repository.TicketRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CheckInServiceReliabilityTest {

    @Mock TicketRepository tickets;
    @Mock CheckInRepository checkIns;
    @Mock EventRepository events;
    @Mock EventSeatRepository seats;

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t"})
    void scan_givenBlankQr_rejectsBeforeRepositoryLookup(String qr) {
        CheckInService service = new CheckInService(tickets, checkIns, events, seats);

        assertThatThrownBy(() -> service.scan(9L, new ScanRequest(qr, "device-1")))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("qrCode is required");
        verify(tickets, never()).findByQrCode(any());
    }

    @Test
    void scan_givenUnknownQr_returnsTicketNotFound() {
        CheckInService service = new CheckInService(tickets, checkIns, events, seats);
        when(tickets.findByQrCode("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.scan(9L, new ScanRequest("missing", "device-1")))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Ticket not found");
    }

    @ParameterizedTest
    @ValueSource(strings = {"USED", "CANCELLED", "REFUNDED", "PENDING"})
    void scan_givenNonValidTicketStatus_rejectsUnsafeScan(String status) {
        CheckInService service = new CheckInService(tickets, checkIns, events, seats);
        Ticket ticket = ticket(status);
        when(tickets.findByQrCode("qr")).thenReturn(Optional.of(ticket));
        if (!"USED".equals(status)) when(checkIns.existsByTicketId(1L)).thenReturn(false);

        assertThatThrownBy(() -> service.scan(9L, new ScanRequest("qr", "device-1")))
                .isInstanceOf(AppException.class);
        verify(tickets, never()).save(any());
    }

    @Test
    void scan_givenExistingCheckIn_rejectsDuplicateQr() {
        CheckInService service = new CheckInService(tickets, checkIns, events, seats);
        when(tickets.findByQrCode("qr")).thenReturn(Optional.of(ticket("VALID")));
        when(checkIns.existsByTicketId(1L)).thenReturn(true);

        assertThatThrownBy(() -> service.scan(9L, new ScanRequest("qr", "device-1")))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("already checked in");
        verify(checkIns, never()).save(any());
    }

    @Test
    void scan_givenUniqueConstraintRace_mapsToAlreadyUsed() {
        CheckInService service = new CheckInService(tickets, checkIns, events, seats);
        when(tickets.findByQrCode("qr")).thenReturn(Optional.of(ticket("VALID")));
        when(checkIns.existsByTicketId(1L)).thenReturn(false);
        when(checkIns.save(any())).thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThatThrownBy(() -> service.scan(9L, new ScanRequest("qr", "device-1")))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("already checked in");
        verify(tickets, never()).save(any());
    }

    @Test
    void scan_givenValidTicket_marksUsedAndReturnsSeatContext() {
        CheckInService service = new CheckInService(tickets, checkIns, events, seats);
        Ticket ticket = ticket("VALID");
        when(tickets.findByQrCode("qr")).thenReturn(Optional.of(ticket));
        when(checkIns.existsByTicketId(1L)).thenReturn(false);
        when(checkIns.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(events.findById(2L)).thenReturn(Optional.of(event()));
        when(seats.findById(3L)).thenReturn(Optional.of(seat()));

        var result = service.scan(9L, new ScanRequest("qr", "gate-a"));

        assertThat(result.status()).isEqualTo("OK");
        assertThat(result.eventTitle()).isEqualTo("Gate reliability");
        assertThat(result.rowLabel()).isEqualTo("B");
        assertThat(ticket.getStatus()).isEqualTo("USED");
        ArgumentCaptor<Ticket> saved = ArgumentCaptor.forClass(Ticket.class);
        verify(tickets).save(saved.capture());
        assertThat(saved.getValue().getStatus()).isEqualTo("USED");
    }

    @Test
    void scan_concurrentDuplicateAttempts_onlyOnePersistsAndOneConflicts() throws Exception {
        CheckInService service = new CheckInService(tickets, checkIns, events, seats);
        AtomicBoolean firstSave = new AtomicBoolean(true);
        CountDownLatch bothAtSave = new CountDownLatch(2);
        when(tickets.findByQrCode("qr")).thenReturn(Optional.of(ticket("VALID")));
        when(checkIns.existsByTicketId(1L)).thenReturn(false);
        when(checkIns.save(any())).thenAnswer(inv -> {
            bothAtSave.countDown();
            bothAtSave.await(2, TimeUnit.SECONDS);
            if (firstSave.getAndSet(false)) return inv.getArgument(0);
            throw new DataIntegrityViolationException("duplicate");
        });
        when(events.findById(2L)).thenReturn(Optional.of(event()));
        when(seats.findById(3L)).thenReturn(Optional.of(seat()));

        var pool = Executors.newFixedThreadPool(2);
        var a = pool.submit(() -> service.scan(9L, new ScanRequest("qr", "gate-a")));
        var b = pool.submit(() -> service.scan(10L, new ScanRequest("qr", "gate-b")));
        int ok = 0;
        int conflict = 0;
        for (var future : java.util.List.of(a, b)) {
            try {
                future.get(5, TimeUnit.SECONDS);
                ok++;
            } catch (Exception ex) {
                if (ex.getCause() instanceof AppException app && "ALREADY_USED".equals(app.getCode())) conflict++;
                else throw ex;
            }
        }
        pool.shutdownNow();

        assertThat(ok).isEqualTo(1);
        assertThat(conflict).isEqualTo(1);
    }

    private static Ticket ticket(String status) {
        Ticket ticket = new Ticket();
        ticket.setId(1L);
        ticket.setUserId(4L);
        ticket.setEventId(2L);
        ticket.setEventSeatId(3L);
        ticket.setOrderItemId(5L);
        ticket.setQrCode("qr");
        ticket.setStatus(status);
        ticket.setIssuedAt(Instant.now());
        return ticket;
    }

    private static Event event() {
        Event event = new Event();
        event.setId(2L);
        event.setTitle("Gate reliability");
        event.setStartTime(Instant.now());
        event.setEndTime(Instant.now().plusSeconds(3600));
        event.setStatus("PUBLISHED");
        return event;
    }

    private static EventSeat seat() {
        EventSeat seat = new EventSeat();
        seat.setId(3L);
        seat.setEventId(2L);
        seat.setRowLabel("B");
        seat.setSeatNumber("12");
        seat.setSection("VIP");
        return seat;
    }
}
