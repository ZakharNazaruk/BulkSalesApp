package com.example.BulkSales.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "discounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Discount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Название акции не может быть пустым")
    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DiscountType type = DiscountType.PERCENT;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private DiscountScope scope = DiscountScope.PRODUCT;

    @DecimalMin(value = "0.0", inclusive = false, message = "Скидка должна быть больше 0")
    @DecimalMax(value = "100.0", inclusive = true, message = "Скидка не может превышать 100%")
    private BigDecimal percent;

    @Column(name = "min_quantity")
    private Integer minQuantity;

    private Integer buyQty;   // для BXGY
    private Integer freeQty;  // для BXGY

    private String category;  // для CATEGORY

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    // Новые поля для VIP скидок
    @Column(name = "is_vip")
    @Builder.Default
    private Boolean isVip = false;

    @Column(name = "min_order_amount")
    private BigDecimal minOrderAmount;

    // Для PRODUCT scope — связь с продуктом
    @ManyToOne
    @JoinColumn(name = "product_id", nullable = true)
    @JsonIgnoreProperties({"discounts"})
    private Product product;

    public boolean isActive() {
        LocalDate today = LocalDate.now();
        return (startDate == null || !today.isBefore(startDate)) &&
                (endDate == null || !today.isAfter(endDate));
    }
}