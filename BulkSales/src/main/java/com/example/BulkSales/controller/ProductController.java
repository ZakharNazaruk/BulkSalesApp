package com.example.BulkSales.controller;

import com.example.BulkSales.dto.ProductDTO;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public List<ProductDTO> getAllProducts() {
        return productService.getAllProducts().stream()
                .map(ProductDTO::from)
                .collect(Collectors.toList());
    }

    @GetMapping("/active")
    public List<ProductDTO> getActiveProducts() {
        return productService.getActiveProducts().stream().map(ProductDTO::from).collect(Collectors.toList());
    }

    @GetMapping("/priority")
    public List<ProductDTO> getPriorityProducts() {
        return productService.getPriorityProducts().stream().map(ProductDTO::from).collect(Collectors.toList());
    }

    @GetMapping("/category/{category}")
    public List<ProductDTO> getActiveByCategory(@PathVariable String category) {
        return productService.getActiveByCategory(category).stream().map(ProductDTO::from).collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ProductDTO getProduct(@PathVariable Long id) {
        return ProductDTO.from(productService.getProductById(id));
    }

    @PostMapping
    public ProductDTO createProduct(@RequestBody Product product) {
        return ProductDTO.from(productService.saveProduct(product));
    }

    @PostMapping(value = "/upload", consumes = { "multipart/form-data" })
    public ProductDTO createProductWithImage(@RequestPart("product") Product product,
                                             @RequestPart(value = "image", required = false) MultipartFile image) {
        // service expected to persist file and set imageUrl like /uploads/<filename>
        return ProductDTO.from(productService.saveProductWithImage(product, image));
    }

    @PutMapping("/{id}")
    public ProductDTO updateProduct(@PathVariable Long id, @RequestBody Product product) {
        return ProductDTO.from(productService.updateProduct(id, product));
    }

    @PostMapping("/{id}/toggle-active")
    public ProductDTO toggleActive(@PathVariable Long id) {
        return ProductDTO.from(productService.toggleActive(id));
    }

    @PostMapping("/{id}/toggle-priority")
    public ProductDTO togglePriority(@PathVariable Long id) {
        return ProductDTO.from(productService.togglePriority(id));
    }

    @DeleteMapping("/{id}")
    public void deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
    }
}
