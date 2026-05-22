package com.odoomaster.ticketing.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "seats",
        uniqueConstraints = @UniqueConstraint(name = "uk_seat_section_row_num",
                columnNames = {"section_id", "row_label", "seat_number"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "section_id", nullable = false)
    private Long sectionId;

    @Column(name = "row_label", nullable = false, length = 8)
    private String rowLabel;

    @Column(name = "seat_number", nullable = false, length = 8)
    private String seatNumber;
}
