package com.odoomaster.ticketing.iam;

import jakarta.persistence.*;
import lombok.*;

/**
 * JPA entity mapping the persistence row for a role.
 */
@Entity
@Table(name = "roles",
        uniqueConstraints = @UniqueConstraint(name = "uk_roles_name", columnNames = "name"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32)
    private String name;
}
