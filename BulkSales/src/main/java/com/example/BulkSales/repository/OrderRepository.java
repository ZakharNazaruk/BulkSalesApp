package com.example.BulkSales.repository;

import com.example.BulkSales.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUserId(Long userId);
    List<Order> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    void deleteByUserId(Long userId);
    List<Long> findOrderIdsByUserId(Long userId); // Для получения ID заказов
    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
}