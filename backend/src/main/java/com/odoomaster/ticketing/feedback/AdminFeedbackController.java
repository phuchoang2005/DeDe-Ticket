package com.odoomaster.ticketing.feedback;

import com.odoomaster.ticketing.feedback.FeedbackDtos.*;
import com.odoomaster.ticketing.feedback.FeedbackService;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for admin feedback listing, summary, and status updates under {@code /v1/admin/feedback}.
 */
@RestController
@RequestMapping("/v1/admin/feedback")
public class AdminFeedbackController {

    private final FeedbackService service;

    public AdminFeedbackController(FeedbackService service) {
        this.service = service;
    }

    @GetMapping
    public FeedbackPage list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category) {
        return service.list(page, limit, status, category);
    }

    @GetMapping("/summary")
    public FeedbackSummary summary() {
        return service.summary();
    }

    @PatchMapping("/{id}/status")
    public FeedbackView updateStatus(@PathVariable Long id, @RequestBody UpdateStatusRequest req) {
        return service.updateStatus(id, req);
    }
}
