package com.odoomaster.ticketing.service;

import com.odoomaster.ticketing.domain.Notification;
import com.odoomaster.ticketing.dto.NotificationDtos.*;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class NotificationService {

    private final NotificationRepository notifications;

    public NotificationService(NotificationRepository notifications) {
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public InboxResponse inbox(Long userId, String typeFilter) {
        List<Notification> all = notifications.findByUserIdOrderByCreatedAtDesc(userId);

        Map<String, Long> counts = new LinkedHashMap<>();
        for (Notification n : all) counts.merge(n.getType(), 1L, Long::sum);

        List<NotificationView> items = all.stream()
                .filter(n -> typeFilter == null || typeFilter.isBlank() || typeFilter.equalsIgnoreCase(n.getType()))
                .map(this::view)
                .toList();

        long unread = all.stream().filter(n -> n.getReadAt() == null).count();
        return new InboxResponse(items, unread, counts);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse unreadCount(Long userId) {
        return new UnreadCountResponse(notifications.countByUserIdAndReadAtIsNull(userId));
    }

    @Transactional
    public NotificationView markRead(Long userId, Long notificationId) {
        Notification n = notifications.findById(notificationId)
                .orElseThrow(() -> new AppException("NOTIFICATION_NOT_FOUND", "Notification not found.", HttpStatus.NOT_FOUND));
        if (!Objects.equals(n.getUserId(), userId)) {
            throw new AppException("FORBIDDEN", "Notification does not belong to current user.", HttpStatus.FORBIDDEN);
        }
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            notifications.save(n);
        }
        return view(n);
    }

    @Transactional
    public int markAllRead(Long userId) {
        return notifications.markAllRead(userId, Instant.now());
    }

    @Transactional
    public Notification create(Long userId, String type, String title, String content, String channel, String linkUrl) {
        return notifications.save(Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .content(content)
                .channel(channel != null ? channel : "IN_APP")
                .status("SENT")
                .linkUrl(linkUrl)
                .sentAt(Instant.now())
                .build());
    }

    private NotificationView view(Notification n) {
        return new NotificationView(
                n.getId(), n.getType(), n.getTitle(), n.getContent(), n.getChannel(),
                n.getStatus(), n.getLinkUrl(), n.getSentAt(), n.getReadAt(), n.getCreatedAt());
    }
}
