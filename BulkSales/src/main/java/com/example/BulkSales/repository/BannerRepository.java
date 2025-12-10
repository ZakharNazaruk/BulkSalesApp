package com.example.BulkSales.repository;

import com.example.BulkSales.model.Banner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BannerRepository extends JpaRepository<Banner, Long> {
    List<Banner> findAllByActiveTrueOrderByDisplayOrderAscCreatedAtDesc();
    List<Banner> findAllByOrderByDisplayOrderAscCreatedAtDesc();
}
