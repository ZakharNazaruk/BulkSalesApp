package com.bulksales.notification.controller;

import com.bulksales.notification.dto.event.OrderStatusChangedEvent;
import com.bulksales.notification.dto.event.ProductLowStockEvent;
import com.bulksales.notification.dto.request.BroadcastNotificationRequest;
import com.bulksales.notification.dto.response.BroadcastResponse;
import com.bulksales.notification.dto.response.NotificationResponse;
import com.bulksales.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Notifications", description = "API для управления уведомлениями")
public class NotificationController {

    private final NotificationService notificationService;


    @PostMapping("/events/product-low-stock")
    public ResponseEntity<NotificationResponse> handleProductLowStock(
            @Parameter(description = "Данные события о низком остатке товара")
            @Valid @RequestBody ProductLowStockEvent event) {
        log.info("Received PRODUCT_LOW_STOCK event for product: {}", event.getProductName());
        NotificationResponse response = notificationService.handleProductLowStock(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }


    @PostMapping("/events/order-status-changed")
    public ResponseEntity<NotificationResponse> handleOrderStatusChanged(
            @Parameter(description = "Данные события об изменении статуса заказа")
            @Valid @RequestBody OrderStatusChangedEvent event) {
        log.info("Received ORDER_STATUS_CHANGED event for order: {}", event.getOrderId());
        NotificationResponse response = notificationService.handleOrderStatusChanged(event);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }



    @PostMapping("/broadcast")
    public ResponseEntity<BroadcastResponse> broadcastNotification(
            @Parameter(description = "Роль пользователя (должна быть MANAGER)")
            @RequestHeader(value = "X-User-Role", required = false, defaultValue = "MANAGER") String userRole,
            @Parameter(description = "Данные для массовой рассылки")
            @Valid @RequestBody BroadcastNotificationRequest request) {
        
        if (!"MANAGER".equalsIgnoreCase(userRole) && !"ADMIN".equalsIgnoreCase(userRole)) {
            log.warn("Unauthorized broadcast attempt from role: {}", userRole);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        log.info("Processing broadcast request from manager. Title: {}", request.getTitle());
        BroadcastResponse response = notificationService.broadcastToAllUsers(request);
        return ResponseEntity.ok(response);
    }


    @Operation(summary = "Получить уведомление по ID")
    @GetMapping("/{id}")
    public ResponseEntity<NotificationResponse> getNotificationById(
            @Parameter(description = "ID уведомления") @PathVariable Long id) {
        log.info("Fetching notification with ID: {}", id);
        NotificationResponse response = notificationService.getNotificationById(id);
        return ResponseEntity.ok(response);
    }


    @Operation(summary = "Получить все уведомления", description = "Возвращает список всех уведомлений из БД")
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getAllNotifications() {
        log.info("Fetching all notifications");
        List<NotificationResponse> notifications = notificationService.getAllNotifications();
        return ResponseEntity.ok(notifications);
    }


    @Operation(summary = "Получить уведомления пользователя", description = "Возвращает все уведомления для конкретного пользователя")
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<NotificationResponse>> getNotificationsByUserId(
            @Parameter(description = "ID пользователя") @PathVariable Long userId) {
        log.info("Fetching notifications for user: {}", userId);
        List<NotificationResponse> notifications = notificationService.getNotificationsByUserId(userId);
        return ResponseEntity.ok(notifications);
    }

    @Operation(summary = "Получить уведомления пользователя + глобальные")
    @GetMapping("/user/{userId}/with-global")
    public ResponseEntity<List<NotificationResponse>> getUserAndGlobal(@PathVariable Long userId) {
        log.info("Fetching user+global notifications for user: {}", userId);
        List<NotificationResponse> notifications = notificationService.getUserAndGlobalNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    @Operation(summary = "Отметить уведомление прочитанным")
    @PostMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(@PathVariable Long id) {
        log.info("Marking notification {} as read", id);
        NotificationResponse response = notificationService.markAsRead(id);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Проверка работоспособности сервиса")
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Notification Service is running");
    }
}
