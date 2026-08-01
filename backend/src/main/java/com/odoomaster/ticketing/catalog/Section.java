package com.odoomaster.ticketing.catalog;

import jakarta.persistence.*;
import lombok.*;

/**
 * JPA entity mapping the persistence row for a section.
 */
@Entity
@Table(name = "sections",
        uniqueConstraints = @UniqueConstraint(name = "uk_section_venue_name", columnNames = {"venue_id", "name"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Section {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "venue_id", nullable = false)
    private Long venueId;

    @Column(nullable = false, length = 64)
    private String name;
}
