package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findAllByStatusOrderByStartTimeAsc(String status);
}
