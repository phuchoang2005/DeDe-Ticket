package com.odoomaster.ticketing.shared.web;

import java.util.List;

/**
 * The uniform API error response body: {@code { "error": { code, message, details, traceId } }}.
 *
 * <p>This is the error contract shared with the frontend (its {@code apiClient} parses exactly
 * this shape into an {@code ApiError}). Keep both sides in sync when adding error codes.
 */
public record ApiErrorEnvelope(ErrorBody error) {
    /**
     * @param code stable error code
     * @param message human-readable message
     * @param details per-field validation details (may be empty)
     * @param traceId the request trace id for correlation (may be {@code null})
     */
    public record ErrorBody(String code, String message, List<FieldDetail> details, String traceId) {}

    /**
     * @param field the offending field name
     * @param reason why it failed validation
     */
    public record FieldDetail(String field, String reason) {}
}
