package com.example.BulkSales.repository;

import com.example.BulkSales.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByCategoryIgnoreCase(String category);
    List<Product> findByActiveTrue();
    List<Product> findByPriorityTrue();
    List<Product> findByCategoryIgnoreCaseAndActiveTrue(String category);

    @Query("SELECT p FROM Product p JOIN p.groups g WHERE g.id = :groupId AND p.active = true")
    List<Product> findByGroupId(@Param("groupId") Long groupId);

    @Query("SELECT p FROM Product p WHERE p.active = true AND SIZE(p.groups) = 0")
    List<Product> findWithoutGroupsAndActive();

    // Оптимизированные методы с JOIN FETCH
    @Query("SELECT DISTINCT p FROM Product p LEFT JOIN FETCH p.discounts d LEFT JOIN FETCH p.groups g WHERE p.active = true")
    List<Product> findAllActiveWithDiscountsAndGroups();
}