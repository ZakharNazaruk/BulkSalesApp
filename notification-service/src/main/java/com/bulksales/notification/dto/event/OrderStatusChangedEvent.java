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
public class OrderStatusChangedEvent {

    @NotNull
    private Long orderId;

    @NotNull
    private Long userId;

    @NotNull
    private String oldStatus;

    @NotNull
    private String newStatus;
}
