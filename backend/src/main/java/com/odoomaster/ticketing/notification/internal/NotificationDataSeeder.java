package com.odoomaster.ticketing.notification.internal;

import com.odoomaster.ticketing.iam.UserRepository;
import com.odoomaster.ticketing.notification.NotificationService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds welcome notifications for the demo user. Runs after {@code iam} seeding so the demo user
 * exists. Resolves the demo user by email via {@link UserRepository} (a direct cross-module
 * repository call — to be replaced by the {@code iam} UserDirectory API in Sprint 2).
 */
@Component
@Order(3)
public class NotificationDataSeeder implements CommandLineRunner {

    private final NotificationService notifications;
    private final UserRepository users;

    public NotificationDataSeeder(NotificationService notifications, UserRepository users) {
        this.notifications = notifications;
        this.users = users;
    }

    @Override
    @Transactional
    public void run(String... args) {
        users.findByEmail("demo@dede.test").ifPresent(demo -> {
            if (notifications.unreadCount(demo.getId()).unreadCount() == 0) {
                notifications.create(demo.getId(), "WELCOME",
                        "Chào mừng đến với Dề Dê!",
                        "Khám phá các sự kiện đang mở bán và đặt vé chỉ trong vài bước. Bạn sẽ nhận thông báo khi vé được phát hành.",
                        "IN_APP", "/events");
                notifications.create(demo.getId(), "EVENT_REMINDER",
                        "Sự kiện được đề xuất cho bạn",
                        "Workshop Spring Boot for Production sắp diễn ra. Còn ít chỗ — đặt vé sớm để giữ chỗ.",
                        "EMAIL", "/events");
            }
        });
    }
}
