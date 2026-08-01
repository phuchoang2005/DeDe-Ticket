package com.odoomaster.ticketing.catalog;

import jakarta.persistence.*;
import lombok.*;

/**
 * JPA entity mapping the persistence row for a eventcategory.
 */
@Entity
@Table(name = "event_categories",
        uniqueConstraints = @UniqueConstraint(name = "uk_category_name", columnNames = "name"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class EventCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String name;
}
