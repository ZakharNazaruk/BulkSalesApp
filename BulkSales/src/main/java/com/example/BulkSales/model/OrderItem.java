package com.example.BulkSales.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Positive;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "order_id")
    @com.fasterxml.jackson.annotation.JsonBackReference
    private Order order;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Positive
    @Column(nullable = false)
    private int quantity;

    @Digits(integer = 10, fraction = 2)
    @Column(nullable = false)
    private BigDecimal unitPrice; // price applied per unit (after discounts)

    @Digits(integer = 10, fraction = 2)
    @Column(nullable = false)
    private BigDecimal subtotal;
}


