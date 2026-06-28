package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data JPA repository for the Payment aggregate.
 */
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    long countByStatus(String status);
    java.util.List<Payment> findByOrderId(Long orderId);
}
