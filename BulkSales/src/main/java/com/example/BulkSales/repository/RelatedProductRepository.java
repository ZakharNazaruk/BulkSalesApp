package com.example.BulkSales.repository;

import com.example.BulkSales.model.RelatedProduct;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RelatedProductRepository extends JpaRepository<RelatedProduct, Long> {
    List<RelatedProduct> findByProductId(Long productId);
    void deleteByProductIdAndRelatedId(Long productId, Long relatedId);
}