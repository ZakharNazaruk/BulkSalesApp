package com.example.BulkSales.dto;

import com.example.BulkSales.model.Category;

public record CategoryDTO(
        Long id,
        String name,
        String description,
        String nameEn,
        String descriptionEn,
        String imageUrl
) {
    public static CategoryDTO from(Category category) {
        if (category == null) return null;
        return new CategoryDTO(
                category.getId(),
                category.getName(),
                category.getDescription(),
                category.getNameEn(),
                category.getDescriptionEn(),
                category.getImageUrl()
        );
    }
}


