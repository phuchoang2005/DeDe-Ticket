package com.odoomaster.ticketing.notification;

import com.odoomaster.ticketing.notification.NotificationDtos.*;
import com.odoomaster.ticketing.shared.CurrentUser;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST controller for the notification inbox/read endpoints under
 * {@code /v1/notifications}.
 */
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
