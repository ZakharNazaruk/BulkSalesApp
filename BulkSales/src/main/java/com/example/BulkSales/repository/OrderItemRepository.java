package com.example.BulkSales.repository;

import com.example.BulkSales.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    void deleteByOrderId(Long orderId);
    void deleteByProductId(Long productId);
}


