package com.bulksales.notification.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Notification entity - matches BulkSales main project structure
 * Table already exists in bulksales database
 */
@Entity
@Table(name = "notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Reference to User (can be null for global notifications)
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 2000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Severity severity = Severity.INFO;

    @Builder.Default
    @Column(nullable = false, name = "read_flag")
    private boolean readFlag = false;

    @Builder.Default
    @Column(nullable = false, name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Additional fields for notification-service tracking
    @Enumerated(EnumType.STRING)
    @Column(name = "event_type")
    private EventType eventType;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "product_id")
    private Long productId;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_status")
    @Builder.Default
    private DeliveryStatus deliveryStatus = DeliveryStatus.PENDING;

    @Column(name = "email_sent")
    @Builder.Default
    private Boolean emailSent = false;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public enum Severity {
        INFO,
        WARNING,
        CRITICAL
    }

    public enum EventType {
        PRODUCT_LOW_STOCK,
        ORDER_STATUS_CHANGED,
        MANUAL_BROADCAST,
        PRODUCT_AVAILABLE,
        PROMOTION_ALERT
    }

    public enum DeliveryStatus {
        PENDING,
        SENT,
        FAILED,
        QUEUED
    }
}
