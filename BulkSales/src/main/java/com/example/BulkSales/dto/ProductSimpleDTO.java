package com.example.BulkSales.dto;

import com.example.BulkSales.model.Product;
import java.math.BigDecimal;

public record ProductSimpleDTO(
        Long id,
        String name,
        String nameEn,
        String category,
        String description,
        String descriptionEn,
        BigDecimal price,
        BigDecimal discountedPrice,
        boolean active,
        boolean priority,
        String imageUrl,
        Integer quantity,
        Integer displayPriority
) {
    public static ProductSimpleDTO from(Product product) {
        if (product == null) return null;

        return new ProductSimpleDTO(
                product.getId(),
                product.getName(),
                product.getNameEn(),
                product.getCategory(),
                product.getDescription(),
                product.getDescriptionEn(),
                product.getPrice(),
                product.getDiscountedPrice(),
                product.isActive(),
                product.isPriority(),
                product.getImageUrl(),
                product.getQuantity(),
                product.getDisplayPriority()
        );
    }
}