package com.example.BulkSales.repository;

import com.example.BulkSales.model.Cart;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {
    void deleteByUserId(Long userId);
    Optional<Cart> findByUserId(Long userId);
}
