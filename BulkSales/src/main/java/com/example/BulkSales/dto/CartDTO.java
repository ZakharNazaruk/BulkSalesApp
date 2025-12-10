package com.example.BulkSales.dto;

import com.example.BulkSales.model.Cart;
import java.math.BigDecimal;
import java.util.List;

public record CartDTO(
        Long id,
        Long userId,
        List<CartItemDTO> items,
        BigDecimal totalPrice
) {
    public static CartDTO from(Cart cart) {
        if (cart == null) return null;
        return new CartDTO(
                cart.getId(),
                cart.getUser() != null ? cart.getUser().getId() : null,
                cart.getItems() != null
                        ? cart.getItems().stream().map(CartItemDTO::from).toList()
                        : List.of(),
                cart.getTotalPrice()
        );
    }
}
