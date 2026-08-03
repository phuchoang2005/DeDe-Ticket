package com.odoomaster.ticketing.feedback;

import com.odoomaster.ticketing.catalog.Event;
import com.odoomaster.ticketing.feedback.Feedback;
import com.odoomaster.ticketing.iam.User;
import com.odoomaster.ticketing.feedback.FeedbackDtos.*;
import com.odoomaster.ticketing.shared.exception.AppException;
import com.odoomaster.ticketing.catalog.EventRepository;
import com.odoomaster.ticketing.feedback.FeedbackRepository;
import com.odoomaster.ticketing.iam.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * Customer feedback service: submission by users and listing/triage (status + admin notes) by staff.
 */
@Service
public class FeedbackService {

    private static final Set<String> VALID_CATEGORIES = Set.of(
            "GENERAL", "EVENT", "PAYMENT", "BUG_REPORT", "SUGGESTION");
    private static final Set<String> VALID_STATUSES = Set.of("NEW", "READ", "RESOLVED");

    private final FeedbackRepository feedbacks;
    private final UserRepository users;
    private final EventRepository events;

    public FeedbackService(FeedbackRepository feedbacks, UserRepository users, EventRepository events) {
        this.feedbacks = feedbacks;
        this.users = users;
        this.events = events;
    }

    @Transactional
    public FeedbackView submit(Long userId, SubmitFeedbackRequest req) {
        if (req.subject() == null || req.subject().isBlank()) {
            throw new AppException("VALIDATION_FAILED", "Subject is required.", HttpStatus.BAD_REQUEST);
        }
        if (req.body() == null || req.body().isBlank()) {
            throw new AppException("VALIDATION_FAILED", "Body is required.", HttpStatus.BAD_REQUEST);
        }
        String cat = req.category() == null ? "GENERAL" : req.category().toUpperCase();
        if (!VALID_CATEGORIES.contains(cat)) {
            throw new AppException("VALIDATION_FAILED", "Invalid category.", HttpStatus.BAD_REQUEST);
        }
        if (req.rating() != null && (req.rating() < 1 || req.rating() > 5)) {
            throw new AppException("VALIDATION_FAILED", "Rating must be 1–5.", HttpStatus.BAD_REQUEST);
        }

        Feedback fb = Feedback.builder()
                .userId(userId)
                .eventId(req.eventId())
                .category(cat)
                .subject(req.subject().trim())
                .body(req.body().trim())
                .rating(req.rating())
                .status("NEW")
                .build();
        feedbacks.save(fb);

        User user = users.findById(userId).orElse(null);
        Event event = req.eventId() != null ? events.findById(req.eventId()).orElse(null) : null;
        return toView(fb, user, event);
    }

    @Transactional(readOnly = true)
    public FeedbackPage list(int page, int limit, String status, String category) {
        int safePage = Math.max(1, page);
        int safeLimit = Math.min(100, Math.max(1, limit));
        String nStatus = (status == null || status.isBlank()) ? null : status.toUpperCase();
        String nCat = (category == null || category.isBlank()) ? null : category.toUpperCase();

        Page<Feedback> result = feedbacks.findAllFiltered(nStatus, nCat,
                PageRequest.of(safePage - 1, safeLimit));
        List<FeedbackView> items = result.getContent().stream().map(this::toView).toList();
        return new FeedbackPage(items, new PageMeta(safePage, safeLimit, result.getTotalElements(), result.hasNext()));
    }

    @Transactional(readOnly = true)
    public FeedbackSummary summary() {
        long total = feedbacks.count();
        long newCount = feedbacks.countByStatus("NEW");
        long readCount = feedbacks.countByStatus("READ");
        long resolvedCount = feedbacks.countByStatus("RESOLVED");
        List<Feedback> all = feedbacks.findAll();
        Double avgRating = all.stream()
                .filter(f -> f.getRating() != null)
                .mapToInt(Feedback::getRating)
                .average()
                .stream().boxed().findFirst().orElse(null);
        return new FeedbackSummary(total, newCount, readCount, resolvedCount, avgRating);
    }

    @Transactional
    public FeedbackView updateStatus(Long feedbackId, UpdateStatusRequest req) {
        Feedback fb = feedbacks.findById(feedbackId)
                .orElseThrow(() -> new AppException("FEEDBACK_NOT_FOUND", "Feedback not found.", HttpStatus.NOT_FOUND));
        String newStatus = req.status() == null ? null : req.status().toUpperCase();
        if (newStatus == null || !VALID_STATUSES.contains(newStatus)) {
            throw new AppException("VALIDATION_FAILED", "Invalid status.", HttpStatus.BAD_REQUEST);
        }
        fb.setStatus(newStatus);
        if ("RESOLVED".equals(newStatus)) fb.setResolvedAt(Instant.now());
        if (req.adminNote() != null && !req.adminNote().isBlank()) fb.setAdminNote(req.adminNote().trim());
        feedbacks.save(fb);
        return toView(fb);
    }

    private FeedbackView toView(Feedback fb) {
        User user = users.findById(fb.getUserId()).orElse(null);
        Event event = fb.getEventId() != null ? events.findById(fb.getEventId()).orElse(null) : null;
        return toView(fb, user, event);
    }

    private FeedbackView toView(Feedback fb, User user, Event event) {
        return new FeedbackView(
                fb.getId(),
                fb.getUserId(),
                user != null ? user.getEmail() : null,
                fb.getEventId(),
                event != null ? event.getTitle() : null,
                fb.getCategory(),
                fb.getSubject(),
                fb.getBody(),
                fb.getRating(),
                fb.getStatus(),
                fb.getCreatedAt(),
                fb.getResolvedAt(),
                fb.getAdminNote());
    }
}
