package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.EventCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EventCategoryRepository extends JpaRepository<EventCategory, Long> {
    Optional<EventCategory> findByName(String name);
    List<EventCategory> findAllByOrderByNameAsc();
}
