package com.odoomaster.ticketing.web;

import java.util.List;

public record ApiErrorEnvelope(ErrorBody error) {
    public record ErrorBody(String code, String message, List<FieldDetail> details, String traceId) {}
    public record FieldDetail(String field, String reason) {}
}
