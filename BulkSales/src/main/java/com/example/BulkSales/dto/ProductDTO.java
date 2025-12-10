package com.example.BulkSales.dto;

import com.example.BulkSales.model.Product;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

public record ProductDTO(
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
        Integer displayPriority,
        List<ProductGroupDTO> groups
) {
    public static ProductDTO from(Product product) {
        if (product == null) return null;

        return new ProductDTO(
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
                product.getDisplayPriority(),
                product.getGroups() != null ?
                        product.getGroups().stream()
                                .map(ProductGroupDTO::from)
                                .collect(Collectors.toList()) :
                        List.of()
        );
    }
}