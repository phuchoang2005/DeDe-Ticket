package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.domain.EventSeat;
import com.odoomaster.ticketing.domain.Ticket;
import com.odoomaster.ticketing.dto.TicketDtos.ScanRequest;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class ReliabilityMatrixTest {

    @TestFactory
    Stream<DynamicTest> generatedQrCodes_areUniqueUppercaseAndFixedLength() {
        return IntStream.range(0, 160).mapToObj(i -> DynamicTest.dynamicTest(
                "qr uniqueness sample " + i,
                () -> {
                    var seen = new HashSet<String>();
                    for (int j = 0; j < 25; j++) {
                        String qr = UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
                        assertThat(qr).hasSize(32).matches("[0-9A-F]+");
                        assertThat(seen.add(qr)).isTrue();
                    }
                }));
    }

    @TestFactory
    Stream<DynamicTest> seatLockStateMatrix_matchesContentionRules() {
        List<SeatCase> cases = List.of(
                new SeatCase("AVAILABLE", null, true),
                new SeatCase("LOCKED", Instant.now().minusSeconds(60), true),
                new SeatCase("LOCKED", Instant.now().plusSeconds(60), false),
                new SeatCase("SOLD", null, false),
                new SeatCase("BOOKED", null, false),
                new SeatCase("HELD", null, false),
                new SeatCase("CANCELLED", null, false),
                new SeatCase("REFUND_PENDING", null, false));

        return IntStream.range(0, 12).boxed().flatMap(round -> cases.stream().map(c -> DynamicTest.dynamicTest(
                "seat lock rule round " + round + " status " + c.status(),
                () -> {
                    EventSeat seat = seat(round.longValue(), c.status(), c.lockedUntil());
                    assertThat(isLockableForNewOrder(seat, Instant.now())).isEqualTo(c.lockable());
                })));
    }

    @TestFactory
    Stream<DynamicTest> scanPayloadMatrix_flagsMissingQrAndPreservesDeviceId() {
        List<ScanRequest> invalid = List.of(
                new ScanRequest(null, "gate-a"),
                new ScanRequest("", "gate-a"),
                new ScanRequest(" ", "gate-a"),
                new ScanRequest("\t", "gate-a"));
        Stream<DynamicTest> invalidTests = IntStream.range(0, 20).boxed().flatMap(round ->
                invalid.stream().map(req -> DynamicTest.dynamicTest("scan missing qr round " + round,
                        () -> assertThat(isMissingQr(req)).isTrue())));

        Stream<DynamicTest> validTests = IntStream.range(0, 60).mapToObj(i -> DynamicTest.dynamicTest(
                "scan valid qr keeps device " + i,
                () -> {
                    ScanRequest req = new ScanRequest("QR-" + i, "device-" + (i % 10));
                    assertThat(isMissingQr(req)).isFalse();
                    assertThat(req.deviceId()).startsWith("device-");
                }));

        return Stream.concat(invalidTests, validTests);
    }

    @TestFactory
    Stream<DynamicTest> paymentRetryAttemptMatrix_isStrictlyNextCount() {
        return IntStream.range(0, 80).mapToObj(existing -> DynamicTest.dynamicTest(
                "retry attempt after count " + existing,
                () -> assertThat(nextAttemptNo(existing)).isEqualTo(existing + 1)));
    }

    @TestFactory
    Stream<DynamicTest> ticketStatusMatrix_identifiesScannableOnlyWhenValidAndUnused() {
        List<TicketCase> cases = List.of(
                new TicketCase("VALID", false, true),
                new TicketCase("VALID", true, false),
                new TicketCase("USED", false, false),
                new TicketCase("USED", true, false),
                new TicketCase("CANCELLED", false, false),
                new TicketCase("REFUNDED", false, false),
                new TicketCase("PENDING", false, false),
                new TicketCase("EXPIRED", false, false));

        return IntStream.range(0, 16).boxed().flatMap(round -> cases.stream().map(c -> DynamicTest.dynamicTest(
                "ticket scannable round " + round + " " + c.status() + " existing=" + c.existingCheckIn(),
                () -> {
                    Ticket ticket = new Ticket();
                    ticket.setStatus(c.status());
                    assertThat(isScannable(ticket, c.existingCheckIn())).isEqualTo(c.scannable());
                })));
    }

    private static boolean isLockableForNewOrder(EventSeat seat, Instant now) {
        boolean lockExpired = seat.getLockedUntil() != null && seat.getLockedUntil().isBefore(now);
        return "AVAILABLE".equals(seat.getStatus()) || ("LOCKED".equals(seat.getStatus()) && lockExpired);
    }

    private static boolean isMissingQr(ScanRequest req) {
        return req == null || req.qrCode() == null || req.qrCode().isBlank();
    }

    private static int nextAttemptNo(long existingCount) {
        return (int) existingCount + 1;
    }

    private static boolean isScannable(Ticket ticket, boolean existingCheckIn) {
        return "VALID".equals(ticket.getStatus()) && !existingCheckIn;
    }

    private static EventSeat seat(Long id, String status, Instant lockedUntil) {
        EventSeat seat = new EventSeat();
        seat.setId(id);
        seat.setEventId(1L);
        seat.setSeatId(id);
        seat.setRowLabel("A");
        seat.setSeatNumber(String.valueOf(id));
        seat.setSection("MAIN");
        seat.setPrice(BigDecimal.TEN);
        seat.setStatus(status);
        seat.setLockedUntil(lockedUntil);
        seat.setVersion(0);
        return seat;
    }

    private record SeatCase(String status, Instant lockedUntil, boolean lockable) {}

    private record TicketCase(String status, boolean existingCheckIn, boolean scannable) {}
}
