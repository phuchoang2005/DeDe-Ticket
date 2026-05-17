package com.odoomaster.ticketing.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class NotificationDtos {

    public record NotificationView(
            Long id, String type, String title, String content, String channel,
            String status, String linkUrl, Instant sentAt, Instant readAt, Instant createdAt) {}

    public record InboxResponse(
            List<NotificationView> items,
            long unreadCount,
            Map<String, Long> countsByType) {}

    public record UnreadCountResponse(long unreadCount) {}
}
