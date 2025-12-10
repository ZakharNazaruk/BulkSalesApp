package com.example.BulkSales.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "walls")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wall {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "floorplan_id")
    @com.fasterxml.jackson.annotation.JsonBackReference("fp-walls")
    private Floorplan floorplan;

    @Column(nullable = false)
    private Integer x1;
    @Column(nullable = false)
    private Integer y1;
    @Column(nullable = false)
    private Integer x2;
    @Column(nullable = false)
    private Integer y2;
}