package com.example.BulkSales.repository;

import com.example.BulkSales.model.Shelf;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ShelfRepository extends JpaRepository<Shelf, Long> {
    @Query("SELECT s FROM Shelf s LEFT JOIN FETCH s.cells c LEFT JOIN FETCH c.product WHERE s.floorplan.id = :floorplanId")
    List<Shelf> findByFloorplanIdWithCells(@Param("floorplanId") Long floorplanId);

    List<Shelf> findByFloorplanId(Long floorplanId);
}