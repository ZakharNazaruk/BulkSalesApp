package com.example.BulkSales.model;


import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "cart_items")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @ManyToOne
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Positive(message = "Количество должно быть больше нуля")
    @Column(nullable = false)
    private int quantity;

    @DecimalMin(value = "0.0", inclusive = true)
    @Digits(integer = 10, fraction = 2)
    @Column(nullable = false)
    private BigDecimal subtotal;

    @PrePersist
    @PreUpdate
    public void calculateSubtotal() {
        BigDecimal basePrice = product.getPrice();

        // Учёт активной скидки с проверкой минимального количества
        BigDecimal percentToApply = BigDecimal.ZERO;
        if (product.getDiscounts() != null) {
            // Выбираем максимальный процент среди активных скидок, для которых выполнен порог minQuantity
            java.math.BigDecimal max = java.math.BigDecimal.ZERO;
            for (Discount d : product.getDiscounts()) {
                if (d != null && d.isActive()) {
                    Integer minQty = d.getMinQuantity();
                    if (minQty == null || quantity >= minQty) {
                        if (d.getPercent() != null && d.getPercent().compareTo(max) > 0) {
                            max = d.getPercent();
                        }
                    }
                }
            }
            percentToApply = max;
        }

        BigDecimal discountedPrice = basePrice.subtract(
                basePrice.multiply(percentToApply.divide(BigDecimal.valueOf(100)))
        );

        // Дополнительная VIP-скидка (например, 5%)
        boolean isVip = cart != null && cart.getUser() != null && cart.getUser().isVip();
        if (isVip) {
            BigDecimal vipPercent = new BigDecimal("5");
            discountedPrice = discountedPrice.subtract(
                    discountedPrice.multiply(vipPercent.divide(BigDecimal.valueOf(100)))
            );
        }

        subtotal = discountedPrice.multiply(BigDecimal.valueOf(quantity));
    }
}
