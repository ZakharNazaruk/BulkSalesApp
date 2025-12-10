package com.example.BulkSales.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "vip_settings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VipSettings {

    @Id
    private Long id; // всегда 1

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal vipThreshold = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private BigDecimal vipDiscountPercent = BigDecimal.ZERO;
}