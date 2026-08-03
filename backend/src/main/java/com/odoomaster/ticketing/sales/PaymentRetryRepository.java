package com.odoomaster.ticketing.sales;

import com.odoomaster.ticketing.sales.PaymentRetry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Spring Data JPA repository for the PaymentRetry aggregate.
 */
public interface PaymentRetryRepository extends JpaRepository<PaymentRetry, Long> {
    List<PaymentRetry> findByPaymentIdOrderByAttemptNoAsc(Long paymentId);
    long countByPaymentId(Long paymentId);
}
