package com.example.BulkSales.service;

import com.example.BulkSales.model.Product;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

public interface ProductService {
    List<Product> getAllProducts();
    Product getProductById(Long id);
    Product saveProduct(Product product);
    Product updateProduct(Long id, Product updated);
    void deleteProduct(Long id);
    List<Product> getActiveProducts();
    List<Product> getPriorityProducts();
    List<Product> getActiveByCategory(String category);
    Product toggleActive(Long id);
    Product togglePriority(Long id);
    Product saveProductWithImage(Product product, MultipartFile image);
}
