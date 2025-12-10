package com.bulksales.notification.dto.response;

import com.bulksales.notification.model.Notification;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponse {

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

    public static NotificationResponse fromEntity(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .orderId(notification.getOrderId())
                .productId(notification.getProductId())
                .eventType(notification.getEventType() != null ? notification.getEventType().name() : null)
                .title(notification.getTitle())
                .message(notification.getMessage())
                .severity(notification.getSeverity() != null ? notification.getSeverity().name() : null)
                .deliveryStatus(notification.getDeliveryStatus() != null ? notification.getDeliveryStatus().name() : null)
                .emailSent(notification.getEmailSent())
                .readFlag(notification.isReadFlag())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
