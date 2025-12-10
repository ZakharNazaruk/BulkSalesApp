package com.example.BulkSales.controller;

import com.example.BulkSales.dto.OrderDTO;
import com.example.BulkSales.model.CustomUserDetails;
import com.example.BulkSales.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    // --- Оформление заказа из корзины ---
    @PostMapping("/checkout/{userId}")
    public OrderDTO checkout(@PathVariable Long userId) {
        return OrderDTO.from(orderService.checkout(userId));
    }

    // --- Получение заказа по ID ---
    @GetMapping("/{orderId}")
    public OrderDTO getById(@PathVariable Long orderId) {
        return OrderDTO.from(orderService.getById(orderId));
    }

    // --- Заказы текущего пользователя ---
    @GetMapping("/me")
    public List<OrderDTO> getMyOrders(@AuthenticationPrincipal CustomUserDetails currentUser) {
        return orderService.getByUser(currentUser.getId())
                .stream()
                .map(OrderDTO::from)
                .toList();
    }

    // --- Все заказы (для менеджера/админа) ---
    @GetMapping("/all")
    public List<OrderDTO> getAll() {
        return orderService.getAll().stream().map(OrderDTO::from).toList();
    }

    // --- Обновление статуса заказа ---
    @PostMapping("/{orderId}/status")
    public OrderDTO updateStatus(@PathVariable Long orderId, @RequestParam("value") String value) {
        return OrderDTO.from(orderService.updateStatus(orderId, value));
    }

    // --- Все заказы конкретного пользователя (для админа) ---
    @GetMapping("/user/{userId}")
    public List<OrderDTO> getByUser(@PathVariable Long userId) {
        return orderService.getByUser(userId)
                .stream()
                .map(OrderDTO::from)
                .toList();
    }
}
