package com.odoomaster.ticketing.catalog.internal;

import jakarta.persistence.*;
import lombok.*;

/**
 * JPA entity mapping the persistence row for a venue.
 */
@Entity
@Table(name = "venues",
        uniqueConstraints = @UniqueConstraint(name = "uk_venue_name", columnNames = "name"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Venue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 255)
    private String address;
}
