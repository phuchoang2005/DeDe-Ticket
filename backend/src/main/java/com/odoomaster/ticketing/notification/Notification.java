package com.odoomaster.ticketing.notification;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * JPA entity mapping the persistence row for a notification.
 */
@Entity
@Table(name = "notifications",
        indexes = {
            @Index(name = "idx_notifications_user", columnList = "user_id"),
            @Index(name = "idx_notifications_user_read", columnList = "user_id, read_at"),
            @Index(name = "idx_notifications_type", columnList = "type")
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 40)
    private String type;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "channel", length = 20)
    private String channel;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "link_url", length = 500)
    private String linkUrl;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (status == null) status = "SENT";
        if (sentAt == null && "SENT".equals(status)) sentAt = now;
        if (channel == null) channel = "IN_APP";
    }
}
