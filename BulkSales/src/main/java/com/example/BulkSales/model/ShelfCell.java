package com.example.BulkSales.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shelf_cells")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShelfCell {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "shelf_id")
    @com.fasterxml.jackson.annotation.JsonBackReference("shelf-cells")
    private Shelf shelf;

    @Column(nullable = false)
    private Integer rowIndex;

    @Column(nullable = false)
    private Integer colIndex;

    @ManyToOne
    @JoinColumn(name = "product_id")
    private Product product; // может быть null
}