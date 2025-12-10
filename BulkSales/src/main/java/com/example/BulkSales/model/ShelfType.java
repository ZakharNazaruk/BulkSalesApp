package com.example.BulkSales.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shelf_types")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShelfType {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Builder.Default
    private Integer width = 200;

    @Builder.Default
    private Integer height = 80;

    @Builder.Default
    private Integer rows = 3;

    @Builder.Default
    private Integer cols = 6;
}