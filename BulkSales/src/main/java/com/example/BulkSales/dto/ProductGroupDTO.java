package com.example.BulkSales.dto;

import com.example.BulkSales.model.ProductGroup;
import com.example.BulkSales.model.GroupType;
import java.util.List;
import java.util.stream.Collectors;

public record ProductGroupDTO(
        Long id,
        String name,
        String description,
        Integer displayOrder,
        Boolean isActive,
        String imageUrl,
        GroupType type,
        List<ProductSimpleDTO> products  // 🔥 ИЗМЕНЕНО: используем ProductSimpleDTO
) {
    public static ProductGroupDTO from(ProductGroup group) {
        if (group == null) return null;

        return new ProductGroupDTO(
                group.getId(),
                group.getName(),
                group.getDescription(),
                group.getDisplayOrder(),
                group.getIsActive(),
                group.getImageUrl(),
                group.getType(),
                group.getProducts() != null ?
                        group.getProducts().stream()
                                .map(ProductSimpleDTO::from)  // 🔥 ИЗМЕНЕНО
                                .collect(Collectors.toList()) :
                        List.of()
        );
    }
}