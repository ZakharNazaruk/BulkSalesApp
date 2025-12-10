package com.example.BulkSales.controller;

import com.example.BulkSales.dto.CategoryDTO;
import com.example.BulkSales.model.Category;
import com.example.BulkSales.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public List<CategoryDTO> getAll() {
        return categoryService.getAll().stream().map(CategoryDTO::from).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public CategoryDTO getById(@PathVariable Long id) {
        return CategoryDTO.from(categoryService.getById(id));
    }

    @PostMapping
    public CategoryDTO create(@RequestBody Category category) {
        return CategoryDTO.from(categoryService.create(category));
    }

    @PutMapping("/{id}")
    public CategoryDTO update(@PathVariable Long id, @RequestBody Category category) {
        return CategoryDTO.from(categoryService.update(id, category));
    }

    @PostMapping(value = "/upload", consumes = { "multipart/form-data" })
    public CategoryDTO createWithImage(@RequestPart("category") Category category,
                                       @RequestPart(value = "image", required = false) org.springframework.web.multipart.MultipartFile image) {
        if (image != null && !image.isEmpty()) {
            try {
                java.nio.file.Path dir = java.nio.file.Paths.get(System.getProperty("user.dir"), "uploads").toAbsolutePath().normalize();
                java.nio.file.Files.createDirectories(dir);
                String original = image.getOriginalFilename();
                String clean = original == null ? "image" : original.replaceAll("[^a-zA-Z0-9._-]", "_");
                String filename = System.currentTimeMillis() + "_" + clean;
                java.nio.file.Path target = dir.resolve(filename);
                java.nio.file.Files.copy(image.getInputStream(), target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                category.setImageUrl("/uploads/" + filename);
            } catch (Exception ignored) {}
        }
        return CategoryDTO.from(categoryService.create(category));
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        categoryService.delete(id);
    }
}


