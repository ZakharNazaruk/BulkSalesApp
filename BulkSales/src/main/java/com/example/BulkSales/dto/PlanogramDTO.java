package com.example.BulkSales.dto;

import com.example.BulkSales.model.Planogram;
import java.util.List;
import java.util.stream.Collectors;

public record PlanogramDTO(
        Long id,
        String name,
        int shelfNumber,
        int positionOnShelf,
        boolean visible,
        List<ProductDTO> products
) {
    public static PlanogramDTO from(Planogram planogram) {
        if (planogram == null) return null;
        return new PlanogramDTO(
                planogram.getId(),
                planogram.getName(),
                planogram.getShelfNumber(),
                planogram.getPositionOnShelf(),
                planogram.isVisible(),
                planogram.getProducts() != null
                        ? planogram.getProducts().stream().map(ProductDTO::from).toList()
                        : List.of()
        );
    }
}
