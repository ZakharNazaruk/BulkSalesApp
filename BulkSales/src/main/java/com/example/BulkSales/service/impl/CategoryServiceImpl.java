package com.example.BulkSales.service.impl;

import com.example.BulkSales.exceptions.InvalidOperationException;
import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.model.Category;
import com.example.BulkSales.repository.CategoryRepository;
import com.example.BulkSales.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@RequiredArgsConstructor
@Service
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    public List<Category> getAll() {
        return categoryRepository.findAll();
    }

    @Override
    public Category getById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
    }

    @Override
    public Category create(Category category) {
        if (categoryRepository.existsByNameIgnoreCase(category.getName())) {
            throw new InvalidOperationException("Category already exists: " + category.getName());
        }
        return categoryRepository.save(category);
    }

    @Override
    public Category update(Long id, Category category) {
        Category existing = getById(id);
        existing.setName(category.getName());
        existing.setDescription(category.getDescription());
        existing.setImageUrl(category.getImageUrl());
        return categoryRepository.save(existing);
    }

    @Override
    public void delete(Long id) {
        Category existing = getById(id);
        categoryRepository.delete(existing);
    }
}


