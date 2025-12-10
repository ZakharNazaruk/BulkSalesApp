package com.example.BulkSales.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "related_products")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RelatedProduct {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(optional = false)
    @JoinColumn(name = "related_id")
    private Product related;
}