package com.example.BulkSales.feign;

import com.example.BulkSales.dto.event.OrderStatusChangedEvent;
import com.example.BulkSales.dto.event.ProductLowStockEvent;
import com.example.BulkSales.dto.request.BroadcastNotificationRequest;
import com.example.BulkSales.dto.response.BroadcastResponse;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;


@FeignClient(
        name = "notification-service",
        url = "${notification.service.url:http://localhost:8081}"
)
public interface NotificationServiceClient {


    @PostMapping("/api/notifications/events/order-status-changed")
    void notifyOrderStatusChanged(@RequestBody OrderStatusChangedEvent event);


    @PostMapping("/api/notifications/events/product-low-stock")
    void notifyProductLowStock(@RequestBody ProductLowStockEvent event);

    @PostMapping("/api/notifications/broadcast")
    BroadcastResponse broadcastNotification(
            @RequestHeader("X-User-Role") String userRole,
            @RequestBody BroadcastNotificationRequest request
    );

    // Proxy reads to notification-service
    @GetMapping("/api/notifications/user/{userId}")
    java.util.List<com.example.BulkSales.dto.response.NotificationProxyResponse> getNotificationsByUserId(@PathVariable("userId") Long userId);

    @GetMapping("/api/notifications/user/{userId}/with-global")
    java.util.List<com.example.BulkSales.dto.response.NotificationProxyResponse> getUserAndGlobal(@PathVariable("userId") Long userId);

    @PostMapping("/api/notifications/{id}/read")
    com.example.BulkSales.dto.response.NotificationProxyResponse markAsRead(@PathVariable("id") Long id);
}
