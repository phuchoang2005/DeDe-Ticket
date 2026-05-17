package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.dto.NotificationDtos.*;
import com.odoomaster.ticketing.security.CurrentUser;
import com.odoomaster.ticketing.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/v1/notifications")
public class NotificationController {

    private final NotificationService notifications;
    private final CurrentUser current;

    public NotificationController(NotificationService notifications, CurrentUser current) {
        this.notifications = notifications;
        this.current = current;
    }

    @GetMapping
    public InboxResponse inbox(@RequestParam(required = false) String type) {
        return notifications.inbox(current.require().userId(), type);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unread() {
        return notifications.unreadCount(current.require().userId());
    }

    @PostMapping("/{id}/read")
    public NotificationView markRead(@PathVariable Long id) {
        return notifications.markRead(current.require().userId(), id);
    }

    @PostMapping("/read-all")
    public Map<String, Integer> markAllRead() {
        return Map.of("updated", notifications.markAllRead(current.require().userId()));
    }
}
