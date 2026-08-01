package com.odoomaster.ticketing.sales;

import com.odoomaster.ticketing.sales.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data JPA repository for the Payment aggregate.
 */
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    long countByStatus(String status);
    java.util.List<Payment> findByOrderId(Long orderId);
}
