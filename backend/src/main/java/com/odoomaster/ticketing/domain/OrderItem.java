package com.odoomaster.ticketing.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * JPA entity mapping the persistence row for a orderitem.
 */
@Entity
@Table(name = "order_items",
        uniqueConstraints = @UniqueConstraint(name = "uk_order_items_seat", columnNames = "event_seat_id"),
        indexes = @Index(name = "idx_order_items_order", columnList = "order_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "event_seat_id", nullable = false)
    private Long eventSeatId;

    @Column(name = "ticket_type_id")
    private Long ticketTypeId;

    @Column(nullable = false, precision = 12, scale = 0)
    private BigDecimal price;
}
