package com.example.BulkSales.service;

import com.example.BulkSales.model.Cart;
import com.example.BulkSales.model.CartItem;
import com.example.BulkSales.model.Product;

import java.util.List;

public interface CartService {
    Cart getCartByUserId(Long userId);
    Cart addProduct(Long userId, Long productId, int quantity);
    Cart removeProduct(Long userId, Long productId);
    List<CartItem> getCartItems(Long userId);
}
