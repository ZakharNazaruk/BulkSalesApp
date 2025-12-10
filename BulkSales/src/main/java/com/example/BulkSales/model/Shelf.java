package com.example.BulkSales.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "shelves")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Shelf {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "floorplan_id")
    @com.fasterxml.jackson.annotation.JsonBackReference("fp-shelves")
    private Floorplan floorplan;

    @ManyToOne(optional = false)
    @JoinColumn(name = "shelf_type_id")
    private ShelfType shelfType;

    @Builder.Default
    private Integer x = 0;

    @Builder.Default
    private Integer y = 0;

    @Builder.Default
    private Integer rotation = 0; // 0,90,180,270

    // Индивидуальные размеры (если null, использовать размеры типа полки)
    private Integer width;
    private Integer height;

    @OneToMany(mappedBy = "shelf", cascade = CascadeType.ALL, orphanRemoval = true)
    @com.fasterxml.jackson.annotation.JsonManagedReference("shelf-cells")
    private List<ShelfCell> cells = new ArrayList<>();
}
