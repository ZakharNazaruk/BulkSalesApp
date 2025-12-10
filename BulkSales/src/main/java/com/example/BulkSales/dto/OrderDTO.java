package com.example.BulkSales.dto;

import com.example.BulkSales.model.Order;
import com.example.BulkSales.model.OrderStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderDTO(
        Long id,
        Long userId,
        String userEmail,
        List<OrderItemDTO> items,
        BigDecimal totalPrice,
        OrderStatus status,
        LocalDateTime createdAt
) {
    public static OrderDTO from(Order order) {
        if (order == null) return null;

        return new OrderDTO(
                order.getId(),
                order.getUser() != null ? order.getUser().getId() : null,
                order.getUser() != null ? order.getUser().getEmail() : null,
                order.getItems() != null
                        ? order.getItems().stream().map(OrderItemDTO::from).toList()
                        : List.of(),
                order.getTotalPrice(),
                order.getStatus(),
                order.getCreatedAt()
        );
    }
}
