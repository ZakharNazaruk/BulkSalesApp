package com.bulksales.notification.dto.event;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductLowStockEvent {

    @NotNull
    private Long productId;

    @NotNull
    private String productName;

    @NotNull
    private Integer currentQuantity;

    @NotNull
    private Integer threshold;

    @NotNull
    private Long managerId;
}
