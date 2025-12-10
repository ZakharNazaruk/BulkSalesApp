package com.example.BulkSales.dto;

import com.example.BulkSales.model.Discount;
import com.example.BulkSales.model.DiscountScope;
import com.example.BulkSales.model.DiscountType;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DiscountDTO(
        Long id,
        String name,
        DiscountType type,
        DiscountScope scope,
        BigDecimal percent,
        Integer minQuantity,
        Integer buyQty,
        Integer freeQty,
        String category,
        LocalDate startDate,
        LocalDate endDate,
        Long productId,
        String productName,
        Boolean isVip,
        BigDecimal minOrderAmount,
        boolean active
) {
    public static DiscountDTO from(Discount discount) {
        if (discount == null) return null;
        return new DiscountDTO(
                discount.getId(),
                discount.getName(),
                discount.getType(),
                discount.getScope(),
                discount.getPercent(),
                discount.getMinQuantity(),
                discount.getBuyQty(),
                discount.getFreeQty(),
                discount.getCategory(),
                discount.getStartDate(),
                discount.getEndDate(),
                discount.getProduct() != null ? discount.getProduct().getId() : null,
                discount.getProduct() != null ? discount.getProduct().getName() : null,
                discount.getIsVip() != null ? discount.getIsVip() : false,
                discount.getMinOrderAmount(),
                discount.isActive()
        );
    }
}