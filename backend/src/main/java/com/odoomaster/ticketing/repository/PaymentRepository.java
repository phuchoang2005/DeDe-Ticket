package com.odoomaster.ticketing.repository;

import com.odoomaster.ticketing.domain.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    long countByStatus(String status);
}
