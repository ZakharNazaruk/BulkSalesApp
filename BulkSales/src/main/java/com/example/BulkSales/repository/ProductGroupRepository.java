package com.example.BulkSales.repository;

import com.example.BulkSales.model.ProductGroup;
import com.example.BulkSales.model.GroupType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductGroupRepository extends JpaRepository<ProductGroup, Long> {

    // Базовые методы
    List<ProductGroup> findByIsActiveTrueOrderByDisplayOrderAsc();
    List<ProductGroup> findByTypeAndIsActiveTrueOrderByDisplayOrderAsc(GroupType type);
    boolean existsByName(String name);

    // 🔥 ДОБАВИТЬ эти методы если их нет:
    @Query("SELECT DISTINCT pg FROM ProductGroup pg LEFT JOIN FETCH pg.products")
    List<ProductGroup> findAllWithProducts();

    @Query("SELECT DISTINCT pg FROM ProductGroup pg LEFT JOIN FETCH pg.products")
    Page<ProductGroup> findAllWithProducts(Pageable pageable);

    @Query("SELECT DISTINCT pg FROM ProductGroup pg LEFT JOIN FETCH pg.products WHERE pg.id = :id")
    Optional<ProductGroup> findByIdWithProducts(@Param("id") Long id);

    @Query("SELECT pg FROM ProductGroup pg WHERE " +
            "LOWER(pg.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "LOWER(pg.description) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<ProductGroup> searchGroups(@Param("query") String query);

    @Query("SELECT MAX(pg.displayOrder) FROM ProductGroup pg")
    Integer findMaxDisplayOrder();
}