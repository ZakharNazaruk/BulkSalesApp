package com.example.BulkSales.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class NotificationProxyResponse {
    private Long id;
    private Long userId;
    private Long orderId;
    private Long productId;
    private String eventType;
    private String title;
    private String message;
    private String severity;
    private String deliveryStatus;
    private Boolean emailSent;
    private Boolean readFlag;
    private LocalDateTime createdAt;
}
