package com.example.BulkSales.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Название товара не может быть пустым")
    @Column(nullable = false)
    private String name;

    private String description;

    private String nameEn;

    private String descriptionEn;

    @NotBlank(message = "Категория обязательна")
    @Column(nullable = false)
    private String category;

    @DecimalMin(value = "0.0", inclusive = false, message = "Цена должна быть больше 0")
    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 0; // количество на складе

    // Витринный приоритет для визуального мерчандайзинга (меньше — выше)
    @Builder.Default
    private Integer displayPriority = 100;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true; // Активен ли товар

    @Column(nullable = false)
    @Builder.Default
    private boolean priority = false; // 👈 пометка "новинка", "топ продаж"

    private String imageUrl; // ссылка на изображение товара

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Discount> discounts = new ArrayList<>();

    @ManyToMany(mappedBy = "products", fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"products", "groups"})  // Двойное исключение циклических ссылок
    @Builder.Default
    private List<ProductGroup> groups = new ArrayList<>();


    // 🔧 Удобный метод для получения активной скидки
    public Discount getActiveDiscount() {
        if (discounts == null) return null;
        return discounts.stream()
                .filter(Discount::isActive)
                .findFirst()
                .orElse(null);
    }

    public BigDecimal getDiscountedPrice() {
        Discount discount = getActiveDiscount();
        if (discount == null) return price;

        BigDecimal discountMultiplier = discount.getPercent()
                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        BigDecimal discountAmount = price.multiply(discountMultiplier)
                .setScale(2, RoundingMode.HALF_UP);

        return price.subtract(discountAmount).max(BigDecimal.ZERO);
    }
}
