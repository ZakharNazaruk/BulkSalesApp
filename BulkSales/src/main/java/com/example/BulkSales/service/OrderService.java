package com.example.BulkSales.service;

import com.example.BulkSales.model.Order;

import java.util.List;

public interface OrderService {
    Order checkout(Long userId);
    Order getById(Long orderId);
    List<Order> getByUser(Long userId);
    List<Order> getAll();
    Order updateStatus(Long orderId, String statusValue);
}


