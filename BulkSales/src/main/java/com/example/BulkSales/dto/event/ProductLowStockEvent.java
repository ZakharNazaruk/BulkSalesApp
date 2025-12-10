package com.example.BulkSales.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductLowStockEvent {
    private Long productId;
    private String productName;
    private Integer currentQuantity;
    private Integer threshold;
    private Long managerId;
}
