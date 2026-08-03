package com.odoomaster.ticketing.catalog;

import com.odoomaster.ticketing.catalog.Venue;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data JPA repository for the Venue aggregate.
 */
public interface VenueRepository extends JpaRepository<Venue, Long> {
    Optional<Venue> findByName(String name);
    List<Venue> findAllByOrderByNameAsc();
}
