package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.CheckIn;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface CheckInRepository extends JpaRepository<CheckIn, Long> {
    Optional<CheckIn> findByTicketId(Long ticketId);
    boolean existsByTicketId(Long ticketId);
    long countByTicketIdIn(java.util.List<Long> ticketIds);

    // Most-recent-first check-in history with the joined event, seat and scanner.
    // A null scannerId returns every scanner's rows (full access); a non-null
    // value scopes to that scanner — SCANNER staff only see their own check-ins.
    @Query(value = """
            SELECT ci.id AS id, ci.ticket_id AS ticketId, ci.checked_in_at AS checkedInAt,
                   ci.status AS status, ci.device_id AS deviceId,
                   t.event_id AS eventId, e.title AS eventTitle,
                   es.section AS section, es.row_label AS rowLabel, es.seat_number AS seatNumber,
                   u.id AS scannedById, u.full_name AS scannedByName, u.email AS scannedByEmail
            FROM check_ins ci
            JOIN tickets t ON t.id = ci.ticket_id
            JOIN events e ON e.id = t.event_id
            JOIN event_seats es ON es.id = t.event_seat_id
            JOIN users u ON u.id = ci.checked_in_by
            WHERE (:scannerId IS NULL OR ci.checked_in_by = :scannerId)
            ORDER BY ci.checked_in_at DESC
            """, nativeQuery = true)
    List<ScanHistoryRow> findHistory(@Param("scannerId") Long scannerId, Pageable pageable);

    // Native-query projection; getter names match the SELECT aliases.
    interface ScanHistoryRow {
        Long getId();
        Long getTicketId();
        Instant getCheckedInAt();
        String getStatus();
        String getDeviceId();
        Long getEventId();
        String getEventTitle();
        String getSection();
        String getRowLabel();
        String getSeatNumber();
        Long getScannedById();
        String getScannedByName();
        String getScannedByEmail();
    }
}
