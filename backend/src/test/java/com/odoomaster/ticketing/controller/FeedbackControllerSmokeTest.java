package com.odoomaster.ticketing.controller;

import com.odoomaster.ticketing.dto.FeedbackDtos.*;
import com.odoomaster.ticketing.exception.AppException;
import com.odoomaster.ticketing.security.AuthPrincipal;
import com.odoomaster.ticketing.security.CurrentUser;
import com.odoomaster.ticketing.service.FeedbackService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FeedbackControllerSmokeTest {

    @Mock FeedbackService feedbackService;
    @Mock CurrentUser currentUser;

    @InjectMocks FeedbackController feedbackController;
    @InjectMocks AdminFeedbackController adminController;

    private static final AuthPrincipal PRINCIPAL = new AuthPrincipal(1L, "user@test.com", "USER");

    @BeforeEach
    void setup() {
        lenient().when(currentUser.require()).thenReturn(PRINCIPAL);
    }

    // ── POST /v1/feedback ────────────────────────────────────────────────────

    @Test
    void submit_returns201WithLocation() {
        FeedbackView view = sampleView(42L, "NEW");
        var req = new SubmitFeedbackRequest(null, "GENERAL", "Great", "body", 5);
        when(feedbackService.submit(eq(1L), eq(req))).thenReturn(view);

        ResponseEntity<FeedbackView> res = feedbackController.submit(req);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(res.getBody()).isEqualTo(view);
        assertThat(res.getHeaders().getLocation()).hasPath("/v1/feedback/42");
    }

    @Test
    void submit_serviceThrows_propagatesException() {
        var req = new SubmitFeedbackRequest(null, "GENERAL", "  ", "body", null);
        when(feedbackService.submit(anyLong(), any())).thenThrow(
                new AppException("VALIDATION_FAILED", "Subject is required.", HttpStatus.BAD_REQUEST));

        assertThatThrownBy(() -> feedbackController.submit(req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("Subject");
    }

    // ── GET /v1/admin/feedback ───────────────────────────────────────────────

    @Test
    void adminList_defaultParams_returnsPage() {
        FeedbackPage page = new FeedbackPage(List.of(), new PageMeta(1, 20, 0, false));
        when(feedbackService.list(1, 20, null, null)).thenReturn(page);

        FeedbackPage result = adminController.list(1, 20, null, null);

        assertThat(result.data()).isEmpty();
        assertThat(result.page().total()).isEqualTo(0);
        verify(feedbackService).list(1, 20, null, null);
    }

    @Test
    void adminList_withFilters_passesThrough() {
        FeedbackPage page = new FeedbackPage(List.of(sampleView(1L, "NEW")),
                new PageMeta(1, 20, 1, false));
        when(feedbackService.list(1, 20, "NEW", "BUG_REPORT")).thenReturn(page);

        FeedbackPage result = adminController.list(1, 20, "NEW", "BUG_REPORT");

        assertThat(result.data()).hasSize(1);
        verify(feedbackService).list(1, 20, "NEW", "BUG_REPORT");
    }

    // ── GET /v1/admin/feedback/summary ───────────────────────────────────────

    @Test
    void adminSummary_returnsSummary() {
        FeedbackSummary summary = new FeedbackSummary(10, 3, 5, 2, 4.2);
        when(feedbackService.summary()).thenReturn(summary);

        FeedbackSummary result = adminController.summary();

        assertThat(result.total()).isEqualTo(10);
        assertThat(result.newCount()).isEqualTo(3);
        assertThat(result.avgRating()).isEqualTo(4.2);
    }

    // ── PATCH /v1/admin/feedback/{id}/status ─────────────────────────────────

    @Test
    void adminUpdateStatus_delegatesToService() {
        FeedbackView updated = sampleView(7L, "RESOLVED");
        var req = new UpdateStatusRequest("RESOLVED", "handled by admin");
        when(feedbackService.updateStatus(7L, req)).thenReturn(updated);

        FeedbackView result = adminController.updateStatus(7L, req);

        assertThat(result.status()).isEqualTo("RESOLVED");
        verify(feedbackService).updateStatus(7L, req);
    }

    @Test
    void adminUpdateStatus_notFound_propagatesException() {
        var req = new UpdateStatusRequest("READ", null);
        when(feedbackService.updateStatus(eq(99L), any()))
                .thenThrow(new AppException("FEEDBACK_NOT_FOUND", "Feedback not found.", HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> adminController.updateStatus(99L, req))
                .isInstanceOf(AppException.class)
                .hasMessageContaining("not found");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static FeedbackView sampleView(Long id, String status) {
        return new FeedbackView(id, 1L, "user@test.com", null, null,
                "GENERAL", "subject", "body", 5, status,
                Instant.now(), null, null);
    }
}
