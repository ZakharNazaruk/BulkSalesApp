package com.example.BulkSales.controller;

import com.example.BulkSales.dto.request.BroadcastNotificationRequest;
import com.example.BulkSales.dto.response.BroadcastResponse;
import com.example.BulkSales.feign.NotificationServiceClient;
import com.example.BulkSales.model.CustomUserDetails;
import com.example.BulkSales.repository.NotificationRepository;
import com.example.BulkSales.repository.UserRepository;
import com.example.BulkSales.dto.response.NotificationProxyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final NotificationServiceClient notificationServiceClient;

    @GetMapping
    public List<NotificationProxyResponse> list(@AuthenticationPrincipal CustomUserDetails currentUser) {
        Long uid = currentUser != null ? currentUser.getId() : null;
        if (uid == null) return java.util.Collections.emptyList();
        // Proxy to notification-service to avoid data divergence (user + global)
        return notificationServiceClient.getUserAndGlobal(uid);
    }

    @PostMapping("/{id}/read")
    public NotificationProxyResponse markRead(@PathVariable Long id, @AuthenticationPrincipal CustomUserDetails currentUser) {
        // Delegate to notification-service which owns notifications storage
        return notificationServiceClient.markAsRead(id);
    }

    @GetMapping("/count")
    public long count(@AuthenticationPrincipal CustomUserDetails currentUser) {
        Long uid = currentUser != null ? currentUser.getId() : null;
        if (uid == null) return 0L;
        return notificationServiceClient.getUserAndGlobal(uid)
                .stream()
                .filter(n -> n.getReadFlag() == null || !n.getReadFlag())
                .count();
    }

    @PostMapping("/broadcast")
    public BroadcastResponse broadcast(
            @RequestBody BroadcastNotificationRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser
    ) {
        boolean allowed = currentUser != null && currentUser.getAuthorities() != null &&
                currentUser.getAuthorities().stream().anyMatch(a -> {
                    String r = a.getAuthority();
                    return "ROLE_MANAGER".equalsIgnoreCase(r) || "ROLE_ADMIN".equalsIgnoreCase(r)
                            || "MANAGER".equalsIgnoreCase(r) || "ADMIN".equalsIgnoreCase(r);
                });
        if (!allowed) {
            throw new AccessDeniedException("Only MANAGER or ADMIN can broadcast notifications");
        }
        // Prefer MANAGER header if present, else ADMIN
        String roleHeader = currentUser.getAuthorities().stream().anyMatch(a -> {
            String r = a.getAuthority();
            return "ROLE_MANAGER".equalsIgnoreCase(r) || "MANAGER".equalsIgnoreCase(r);
        }) ? "MANAGER" : "ADMIN";
        return notificationServiceClient.broadcastNotification(roleHeader, request);
    }
}
