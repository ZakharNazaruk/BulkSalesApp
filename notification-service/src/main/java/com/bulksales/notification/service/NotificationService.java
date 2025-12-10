package com.bulksales.notification.service;

import com.bulksales.notification.dto.event.OrderStatusChangedEvent;
import com.bulksales.notification.dto.event.ProductLowStockEvent;
import com.bulksales.notification.dto.request.BroadcastNotificationRequest;
import com.bulksales.notification.dto.response.BroadcastResponse;
import com.bulksales.notification.dto.response.NotificationResponse;
import com.bulksales.notification.feign.OrderFeignClient;
import com.bulksales.notification.feign.ProductFeignClient;
import com.bulksales.notification.feign.UserFeignClient;
import com.bulksales.notification.feign.dto.OrderDTO;
import com.bulksales.notification.feign.dto.UserDTO;
import com.bulksales.notification.model.Notification;
import com.bulksales.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;
    private final UserFeignClient userFeignClient;
    private final OrderFeignClient orderFeignClient;
    private final ProductFeignClient productFeignClient;

    /**
     * Scenario 1: Handle PRODUCT_LOW_STOCK event
     * Get manager data via Feign, send email, save to DB
     */
    @Transactional
    public NotificationResponse handleProductLowStock(ProductLowStockEvent event) {
        log.info("Processing PRODUCT_LOW_STOCK event for product: {}", event.getProductName());

        try {
            // Get all managers and admins via FeignClient
            List<UserDTO> allUsers = userFeignClient.getAllUsers();
            List<UserDTO> managers = allUsers.stream()
                    .filter(u -> "MANAGER".equalsIgnoreCase(u.getRole()) || "ADMIN".equalsIgnoreCase(u.getRole()))
                    .toList();
            
            if (managers.isEmpty()) {
                log.warn("No managers found to notify about low stock for product: {}", event.getProductName());
                throw new RuntimeException("No managers found");
            }
            
            log.info("Found {} managers/admins to notify", managers.size());

            // Formulate notification message
            String title = "⚠️ Низкий запас: " + event.getProductName();
            String message = String.format(
                    "Товар '%s' (ID: %d) заканчивается на складе.\n" +
                            "Текущее количество: %d\n" +
                            "Порог: %d\n\n" +
                            "Пожалуйста, примите меры по пополнению запасов.",
                    event.getProductName(), event.getProductId(),
                    event.getCurrentQuantity(), event.getThreshold()
            );

            int successCount = 0;
            int failureCount = 0;
            
            // Send notification to each manager
            for (UserDTO manager : managers) {
                try {
                    // Send email
                    boolean emailSent = emailService.sendEmail(manager.getEmail(), title, message);

                    // Save notification to database
                    Notification notification = Notification.builder()
                            .userId(manager.getId())
                            .productId(event.getProductId())
                            .eventType(Notification.EventType.PRODUCT_LOW_STOCK)
                            .title(title)
                            .message(message)
                            .severity(Notification.Severity.WARNING)
                            .deliveryStatus(emailSent ? Notification.DeliveryStatus.SENT : Notification.DeliveryStatus.FAILED)
                            .emailSent(emailSent)
                            .readFlag(false)
                            .build();

                    notificationRepository.save(notification);
                    
                    if (emailSent) {
                        successCount++;
                    } else {
                        failureCount++;
                    }
                    
                    log.info("Notification sent to manager {} ({})", manager.getUsername(), manager.getEmail());
                } catch (Exception e) {
                    log.error("Failed to notify manager {}: {}", manager.getId(), e.getMessage());
                    failureCount++;
                }
            }
            
            log.info("Low stock notifications completed. Success: {}, Failed: {}", successCount, failureCount);

            // Return first saved notification as response (for API compatibility)
            return NotificationResponse.builder()
                    .title(title)
                    .message(String.format("Sent to %d managers (success: %d, failed: %d)", 
                        managers.size(), successCount, failureCount))
                    .severity(Notification.Severity.WARNING.name())
                    .build();

        } catch (Exception e) {
            log.error("Failed to process PRODUCT_LOW_STOCK event: {}", e.getMessage(), e);
            
            // Save as failed notification for system tracking
            Notification failedNotification = Notification.builder()
                    .productId(event.getProductId())
                    .eventType(Notification.EventType.PRODUCT_LOW_STOCK)
                    .title("Low Stock Alert: " + event.getProductName())
                    .message("Failed to process notification: " + e.getMessage())
                    .severity(Notification.Severity.CRITICAL)
                    .deliveryStatus(Notification.DeliveryStatus.FAILED)
                    .emailSent(false)
                    .readFlag(false)
                    .build();

            failedNotification = notificationRepository.save(failedNotification);
            return NotificationResponse.fromEntity(failedNotification);
        }
    }

    /**
     * Scenario 2: Handle ORDER_STATUS_CHANGED event
     * Get user data via Feign, send email, save to DB
     */
    @Transactional
    public NotificationResponse handleOrderStatusChanged(OrderStatusChangedEvent event) {
        log.info("Processing ORDER_STATUS_CHANGED event for order: {}", event.getOrderId());

        try {
            // Get user data via FeignClient
            List<UserDTO> users = userFeignClient.getAllUsers();
            UserDTO user = users.stream()
                    .filter(u -> u.getId() != null && u.getId().equals(event.getUserId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("User not found: " + event.getUserId()));
            
            log.info("Retrieved user data: {}", user.getUsername());

            // Get order data
            OrderDTO order = orderFeignClient.getOrderById(event.getOrderId());
            log.info("Retrieved order data: Order #{} with status: {}", order.getId(), order.getStatus());

            // Formulate notification message
            String title = "📦 Order Status Update - Order #" + event.getOrderId();
            String message = String.format(
                    "Dear Customer,\n\n" +
                            "Your order #%d status has been updated.\n\n" +
                            "Previous status: %s\n" +
                            "New status: %s\n" +
                            "Order total: $%s\n\n" +
                            "Thank you for your business!\n\n" +
                            "Best regards,\n" +
                            "BulkSales Team",
                    event.getOrderId(),
                    event.getOldStatus(), event.getNewStatus(),
                    order.getTotalPrice()
            );

            // Send email
            boolean emailSent = emailService.sendEmail(user.getEmail(), title, message);

            // Save notification to database
            Notification notification = Notification.builder()
                    .userId(event.getUserId())
                    .orderId(event.getOrderId())
                    .eventType(Notification.EventType.ORDER_STATUS_CHANGED)
                    .title(title)
                    .message(message)
                    .severity(Notification.Severity.INFO)
                    .deliveryStatus(emailSent ? Notification.DeliveryStatus.SENT : Notification.DeliveryStatus.FAILED)
                    .emailSent(emailSent)
                    .readFlag(false)
                    .build();

            notification = notificationRepository.save(notification);
            log.info("Notification saved with ID: {} and delivery status: {}", notification.getId(), notification.getDeliveryStatus());

            return NotificationResponse.fromEntity(notification);

        } catch (Exception e) {
            log.error("Failed to process ORDER_STATUS_CHANGED event: {}", e.getMessage(), e);

            // Save as failed notification
            Notification failedNotification = Notification.builder()
                    .userId(event.getUserId())
                    .orderId(event.getOrderId())
                    .eventType(Notification.EventType.ORDER_STATUS_CHANGED)
                    .title("Order Status Update - Order #" + event.getOrderId())
                    .message("Failed to process notification: " + e.getMessage())
                    .severity(Notification.Severity.WARNING)
                    .deliveryStatus(Notification.DeliveryStatus.FAILED)
                    .emailSent(false)
                    .readFlag(false)
                    .build();

            failedNotification = notificationRepository.save(failedNotification);
            return NotificationResponse.fromEntity(failedNotification);
        }
    }

    /**
     * Scenario 3: Manual broadcast to all users
     * Get all users via Feign, send emails, save to DB
     */
    @Transactional
    public BroadcastResponse broadcastToAllUsers(BroadcastNotificationRequest request) {
        log.info("Processing MANUAL_BROADCAST to all users");

        try {
            // Get all regular users via FeignClient
            List<UserDTO> allUsers = userFeignClient.getAllRegularUsers();
            log.info("Retrieved {} users for broadcast", allUsers.size());

            int successCount = 0;
            int failureCount = 0;

            // Send email to each user
            for (UserDTO user : allUsers) {
                try {
                    String personalizedMessage = String.format(
                            "Dear %s,\n\n%s\n\nBest regards,\nBulkSales Team",
                            user.getUsername(), request.getMessage()
                    );

                    boolean emailSent = emailService.sendEmail(user.getEmail(), request.getTitle(), personalizedMessage);

                    // Save notification to database  
                    Notification notification = Notification.builder()
                            .userId(user.getId())
                            .eventType(Notification.EventType.MANUAL_BROADCAST)
                            .title(request.getTitle())
                            .message(personalizedMessage)
                            .severity(Notification.Severity.INFO)
                            .deliveryStatus(emailSent ? Notification.DeliveryStatus.SENT : Notification.DeliveryStatus.FAILED)
                            .emailSent(emailSent)
                            .readFlag(false)
                            .build();

                    notificationRepository.save(notification);

                    if (emailSent) {
                        successCount++;
                    } else {
                        failureCount++;
                    }

                } catch (Exception e) {
                    log.error("Failed to send notification to user {}: {}", user.getId(), e.getMessage());
                    failureCount++;

                    // Save failed notification
                    Notification failedNotification = Notification.builder()
                            .userId(user.getId())
                            .eventType(Notification.EventType.MANUAL_BROADCAST)
                            .title(request.getTitle())
                            .message("Failed: " + e.getMessage())
                            .severity(Notification.Severity.WARNING)
                            .deliveryStatus(Notification.DeliveryStatus.FAILED)
                            .emailSent(false)
                            .readFlag(false)
                            .build();

                    notificationRepository.save(failedNotification);
                }
            }

            log.info("Broadcast completed. Success: {}, Failed: {}", successCount, failureCount);

            return BroadcastResponse.builder()
                    .message("Broadcast completed successfully")
                    .totalUsers(allUsers.size())
                    .successCount(successCount)
                    .failureCount(failureCount)
                    .build();

        } catch (Exception e) {
            log.error("Failed to process MANUAL_BROADCAST: {}", e.getMessage(), e);
            throw new RuntimeException("Broadcast failed: " + e.getMessage());
        }
    }

    /**
     * Get notification by ID
     */
    public NotificationResponse getNotificationById(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found with id: " + id));
        return NotificationResponse.fromEntity(notification);
    }

    /**
     * Get all notifications
     */
    public List<NotificationResponse> getAllNotifications() {
        return notificationRepository.findAll().stream()
                .map(NotificationResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get notifications by user ID
     */
    public List<NotificationResponse> getNotificationsByUserId(Long userId) {
        return notificationRepository.findByUserId(userId).stream()
                .map(NotificationResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get notifications for user including global (userId is null)
     */
    public List<NotificationResponse> getUserAndGlobalNotifications(Long userId) {
        return notificationRepository.findByUserIdOrUserIdIsNullOrderByCreatedAtDesc(userId).stream()
                .map(NotificationResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Mark notification as read
     */
    @Transactional
    public NotificationResponse markAsRead(Long id) {
        Notification n = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + id));
        if (!n.isReadFlag()) {
            n.setReadFlag(true);
            notificationRepository.save(n);
        }
        return NotificationResponse.fromEntity(n);
    }
}
