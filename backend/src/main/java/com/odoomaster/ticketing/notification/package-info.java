/**
 * Notification: in-app notifications.
 *
 * <p>Owns {@code Notification} (in {@code …internal}), {@code NotificationService} and the
 * {@code NotificationEventListener} that reacts to {@code shared:TicketsIssuedEvent}.
 *
 * <p>Publishes no cross-module API (its {@code NotificationController} serves the owner directly).
 * Depends on {@code iam} ({@code UserDirectory} — to resolve recipients in the seeder) and
 * {@code shared}; it is decoupled from {@code sales}/{@code ticketing} via the event contract.
 */
@ApplicationModule(
        displayName = "Notification",
        allowedDependencies = {"iam", "shared"})
package com.odoomaster.ticketing.notification;

import org.springframework.modulith.ApplicationModule;
