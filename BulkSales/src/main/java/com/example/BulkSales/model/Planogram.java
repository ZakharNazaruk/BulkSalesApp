package com.example.BulkSales.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "planograms")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Planogram {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private int shelfNumber; // номер полки
    private int positionOnShelf; // позиция на полке
    private boolean visible = true; // видимость планограммы для клиентов

    @ManyToMany
    @OrderColumn(name = "position_idx")
    @JoinTable(
            name = "planogram_products",
            joinColumns = @JoinColumn(name = "planogram_id"),
            inverseJoinColumns = @JoinColumn(name = "product_id")
    )
    private List<Product> products = new ArrayList<>();
}
