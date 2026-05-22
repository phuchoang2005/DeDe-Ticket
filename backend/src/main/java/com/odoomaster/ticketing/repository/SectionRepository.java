package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.Section;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SectionRepository extends JpaRepository<Section, Long> {
    List<Section> findByVenueIdOrderByNameAsc(Long venueId);
    Optional<Section> findByVenueIdAndName(Long venueId, String name);
}
