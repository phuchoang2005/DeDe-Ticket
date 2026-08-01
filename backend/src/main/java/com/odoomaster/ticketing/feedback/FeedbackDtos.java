package com.odoomaster.ticketing.feedback;

import java.time.Instant;
import java.util.List;

/**
 * DTO record container grouping the request/response value objects for the related API.
 */
public class FeedbackDtos {

    public record SubmitFeedbackRequest(
            Long eventId,
            String category,
            String subject,
            String body,
            Integer rating) {}

    public record FeedbackView(
            Long id,
            Long userId,
            String userEmail,
            Long eventId,
            String eventTitle,
            String category,
            String subject,
            String body,
            Integer rating,
            String status,
            Instant createdAt,
            Instant resolvedAt,
            String adminNote) {}

    public record FeedbackPage(List<FeedbackView> data, PageMeta page) {}

    public record PageMeta(int page, int limit, long total, boolean hasMore) {}

    public record UpdateStatusRequest(String status, String adminNote) {}

    public record FeedbackSummary(
            long total,
            long newCount,
            long readCount,
            long resolvedCount,
            Double avgRating) {}
}
