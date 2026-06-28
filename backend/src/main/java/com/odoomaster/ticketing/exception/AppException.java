package com.odoomaster.ticketing.exception;

import org.springframework.http.HttpStatus;

/**
 * Domain exception carrying a stable error {@code code} and the HTTP {@link HttpStatus} to return.
 *
 * <p>Thrown by the service layer for expected business errors; {@code GlobalExceptionHandler}
 * maps it to the standard {@code ApiErrorEnvelope} so the frontend receives a consistent
 * {@code { error: { code, message, … } }} body.
 */
public class AppException extends RuntimeException {
    private final String code;
    private final HttpStatus status;

    /**
     * @param code stable, machine-readable error code (e.g. {@code SEAT_TAKEN})
     * @param message human-readable message
     * @param status the HTTP status to respond with
     */
    public AppException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }

    /** @return the stable error code */
    public String getCode() { return code; }

    /** @return the HTTP status to respond with */
    public HttpStatus getStatus() { return status; }
}
