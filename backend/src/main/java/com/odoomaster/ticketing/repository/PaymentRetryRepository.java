package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.PaymentRetry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Spring Data JPA repository for the PaymentRetry aggregate.
 */
public interface PaymentRetryRepository extends JpaRepository<PaymentRetry, Long> {
    List<PaymentRetry> findByPaymentIdOrderByAttemptNoAsc(Long paymentId);
    long countByPaymentId(Long paymentId);
}
