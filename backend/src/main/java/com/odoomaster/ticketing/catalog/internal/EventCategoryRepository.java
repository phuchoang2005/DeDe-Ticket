package com.odoomaster.ticketing.catalog.internal;

import com.odoomaster.ticketing.catalog.internal.EventCategory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for the EventCategory aggregate.
 */
public interface EventCategoryRepository extends JpaRepository<EventCategory, Long> {
    Optional<EventCategory> findByName(String name);
    List<EventCategory> findAllByOrderByNameAsc();
}
