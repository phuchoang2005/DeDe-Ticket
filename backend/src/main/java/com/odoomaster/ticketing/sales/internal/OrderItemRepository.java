package com.odoomaster.ticketing.sales.internal;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Spring Data JPA repository for the OrderItem aggregate.
 */
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
  List<OrderItem> findByOrderId(Long orderId);
}
