package com.example.BulkSales.repository;

import com.example.BulkSales.model.Wall;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WallRepository extends JpaRepository<Wall, Long> {

    List<Wall> findByFloorplanId(Long id);
}