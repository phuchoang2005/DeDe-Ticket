package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.EventSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

/**
 * Spring Data JPA repository for the EventSeat aggregate.
 */
public interface EventSeatRepository extends JpaRepository<EventSeat, Long> {
    List<EventSeat> findByEventIdOrderByRowLabelAscSeatNumberAsc(Long eventId);
    List<EventSeat> findByIdIn(List<Long> ids);
    List<EventSeat> findByEventIdAndSection(Long eventId, String section);
    long countByEventId(Long eventId);
    long countByEventIdAndStatus(Long eventId, String status);

    @Query("SELECT COUNT(s) FROM EventSeat s WHERE s.status = 'SOLD'")
    long countAllSold();

    @Query("SELECT COUNT(s) FROM EventSeat s")
    long countAll();

    @Query("SELECT s FROM EventSeat s WHERE s.status = 'LOCKED' AND s.lockedUntil < :now")
    List<EventSeat> findExpiredLocks(@Param("now") Instant now);
}
