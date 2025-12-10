package com.example.BulkSales.dto;

import com.example.BulkSales.model.CartItem;
import java.math.BigDecimal;

public record CartItemDTO(
        Long id,
        Long productId,
        String productName,
        String productNameEn,
        String imageUrl,
        int quantity,
        BigDecimal subtotal
) {
    public static CartItemDTO from(CartItem item) {
        if (item == null) return null;
        return new CartItemDTO(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getProduct().getNameEn(),
                item.getProduct().getImageUrl(),
                item.getQuantity(),
                item.getSubtotal()
        );
    }
}
