/**
 * Feedback: post-event ratings and reviews.
 *
 * <p>Owns {@code Feedback} and its repository (in {@code …internal}) and {@code FeedbackService}.
 *
 * <p>Publishes no cross-module API. Depends on {@code catalog} ({@code EventCatalog} — to validate
 * the event) and {@code iam} ({@code UserDirectory} — to resolve the reviewer), plus {@code shared}.
 */
@ApplicationModule(
        displayName = "Feedback",
        allowedDependencies = {"catalog", "iam", "shared"})
package com.odoomaster.ticketing.feedback;

import org.springframework.modulith.ApplicationModule;
