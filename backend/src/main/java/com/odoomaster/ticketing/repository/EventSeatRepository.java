package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.EventSeat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventSeatRepository extends JpaRepository<EventSeat, Long> {
    List<EventSeat> findByEventIdOrderByRowLabelAscSeatNumberAsc(Long eventId);
    List<EventSeat> findByIdIn(List<Long> ids);
}
