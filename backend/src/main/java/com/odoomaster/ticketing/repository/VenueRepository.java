package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.Venue;
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
