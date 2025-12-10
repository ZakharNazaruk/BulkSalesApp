package com.example.BulkSales.repository;

import com.example.BulkSales.model.Discount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiscountRepository extends JpaRepository<Discount, Long> {

    List<Discount> findByProductId(Long productId);

    List<Discount> findByStartDateBeforeAndEndDateAfter(java.time.LocalDate start, java.time.LocalDate end);
}
