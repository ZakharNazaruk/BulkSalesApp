package com.example.BulkSales.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "floorplans")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Floorplan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Builder.Default
    private Integer width = 1200; // px

    @Builder.Default
    private Integer height = 800; // px

    @OneToMany(mappedBy = "floorplan", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference("fp-walls")
    private List<Wall> walls = new ArrayList<>();

    @OneToMany(mappedBy = "floorplan", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference("fp-shelves")
    private List<Shelf> shelves = new ArrayList<>();
}
