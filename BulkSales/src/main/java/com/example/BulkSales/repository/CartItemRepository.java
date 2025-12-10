package com.example.BulkSales.repository;

import com.example.BulkSales.model.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    void deleteByCartId(Long cartId);
    void deleteByProductId(Long productId);
}
