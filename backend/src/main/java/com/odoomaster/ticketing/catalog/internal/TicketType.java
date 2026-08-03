package com.odoomaster.ticketing.catalog.internal;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * JPA entity mapping the persistence row for a tickettype.
 */
@Entity
@Table(name = "ticket_types",
        uniqueConstraints = @UniqueConstraint(name = "uk_tickettype_event_name",
                columnNames = {"event_id", "name"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TicketType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "sold_quantity", nullable = false)
    private Integer soldQuantity;

    @PrePersist
    void prePersist() {
        if (quantity == null) quantity = 0;
        if (soldQuantity == null) soldQuantity = 0;
    }
}
