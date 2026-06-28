package com.odoomaster.ticketing.service.payment;

/**
 * Outcome returned by a {@link PaymentGateway#charge(PaymentRequest)} call.
 *
 * @param success whether the charge succeeded
 * @param transactionId the gateway transaction reference to persist
 * @param status the persisted payment status (e.g. {@code SUCCEEDED}, {@code FAILED})
 * @param provider the provider that handled the charge
 */
public record PaymentResult(boolean success, String transactionId, String status, String provider) {
}
