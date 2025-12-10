package com.example.BulkSales.service.impl;

import com.example.BulkSales.dto.event.OrderStatusChangedEvent;
import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.feign.NotificationServiceClient;
import com.example.BulkSales.model.*;
import com.example.BulkSales.repository.CartRepository;
import com.example.BulkSales.repository.OrderItemRepository;
import com.example.BulkSales.repository.OrderRepository;
import com.example.BulkSales.repository.UserRepository;
import com.example.BulkSales.repository.DiscountRepository;
import com.example.BulkSales.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
@Slf4j
public class OrderServiceImpl implements OrderService {

    private static final int LOW_STOCK_THRESHOLD = 10;

    private final com.example.BulkSales.repository.ProductRepository productRepository;

    private final UserRepository userRepository;
    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final com.example.BulkSales.repository.VipSettingsRepository vipSettingsRepository;
    private final DiscountRepository discountRepository;
    private final NotificationServiceClient notificationServiceClient;

    @Override
    @Transactional
    public Order checkout(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Cart cart = cartRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart not found"));

        if (cart.getItems().isEmpty()) {
            throw new IllegalStateException("Cart is empty");
        }

        Order order = new Order();
        order.setUser(user);
        order = orderRepository.save(order);

        BigDecimal total = BigDecimal.ZERO;
        // Предзагрузим все активные скидки
        java.util.List<Discount> activeDiscounts = discountRepository.findAll().stream()
                .filter(Discount::isActive)
                .toList();

        // Группируем скидки по типам для эффективного применения
        java.util.Map<DiscountScope, java.util.List<Discount>> discountsByScope = activeDiscounts.stream()
                .collect(java.util.stream.Collectors.groupingBy(Discount::getScope));
        
        // Для групповых BXGY (CATEGORY/GLOBAL) подготовим корзину цен
        java.util.Map<String, java.util.List<BigDecimal>> groupPriceBuckets = new java.util.HashMap<>();
        java.util.Map<Long, BigDecimal> unitAfterLineDiscount = new java.util.HashMap<>();
        
        // Предварительно получим скидки по областям для использования в циклах
        java.util.List<Discount> categoryDiscounts = discountsByScope.get(DiscountScope.CATEGORY);
        java.util.List<Discount> globalDiscounts = discountsByScope.get(DiscountScope.GLOBAL);

        for (CartItem ci : cart.getItems()) {
            Product product = ci.getProduct();
            int qty = ci.getQuantity();
            if (product.getQuantity() == null || product.getQuantity() < qty) {
                throw new IllegalStateException("Not enough stock for product: " + product.getName());
            }

            // Базовая цена (без предварительных продуктовых скидок, чтобы не было двойного применения)
            BigDecimal unit = product.getPrice();
            // VIP-скидка
            try {
                com.example.BulkSales.model.VipSettings cfg = vipSettingsRepository.findById(1L).orElse(null);
                if (cfg != null && user.isVip() && cfg.getVipDiscountPercent() != null && cfg.getVipDiscountPercent().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    unit = unit.subtract(unit.multiply(cfg.getVipDiscountPercent()).divide(java.math.BigDecimal.valueOf(100)));
                }
            } catch (Exception ignored) {}

            // Применяем лучшую процентную скидку: PERCENT и THRESHOLD
            java.math.BigDecimal bestPercent = java.math.BigDecimal.ZERO;
            
            // Сначала продуктовые скидки
            if (product.getDiscounts() != null) {
                for (Discount d : product.getDiscounts()) {
                    if (!d.isActive() || d.getPercent() == null) continue;
                    if (d.getType() == DiscountType.PERCENT) {
                        if (d.getPercent().compareTo(bestPercent) > 0) bestPercent = d.getPercent();
                    } else if (d.getType() == DiscountType.THRESHOLD) {
                        if (d.getMinQuantity() != null && qty >= d.getMinQuantity()) {
                            if (d.getPercent().compareTo(bestPercent) > 0) bestPercent = d.getPercent();
                        }
                    }
                }
            }
            
            // Затем категорийные скидки
            if (categoryDiscounts != null) {
                for (Discount d : categoryDiscounts) {
                    if (!d.isActive() || d.getPercent() == null) continue;
                    if (product.getCategory().equals(d.getCategory())) {
                        if (d.getType() == DiscountType.PERCENT) {
                            if (d.getPercent().compareTo(bestPercent) > 0) bestPercent = d.getPercent();
                        } else if (d.getType() == DiscountType.THRESHOLD) {
                            if (d.getMinQuantity() != null && qty >= d.getMinQuantity()) {
                                if (d.getPercent().compareTo(bestPercent) > 0) bestPercent = d.getPercent();
                            }
                        }
                    }
                }
            }
            
            // Наконец глобальные скидки
            if (globalDiscounts != null) {
                for (Discount d : globalDiscounts) {
                    if (!d.isActive() || d.getPercent() == null) continue;
                    if (d.getType() == DiscountType.PERCENT) {
                        if (d.getPercent().compareTo(bestPercent) > 0) bestPercent = d.getPercent();
                    } else if (d.getType() == DiscountType.THRESHOLD) {
                        if (d.getMinQuantity() != null && qty >= d.getMinQuantity()) {
                            if (d.getPercent().compareTo(bestPercent) > 0) bestPercent = d.getPercent();
                        }
                    }
                }
            }
            if (bestPercent.compareTo(java.math.BigDecimal.ZERO) > 0) {
                unit = unit.subtract(unit.multiply(bestPercent).divide(java.math.BigDecimal.valueOf(100)));
            }
            unitAfterLineDiscount.put(product.getId(), unit);

            // Подготовить бакеты для групповых BXGY расчётов
            // GLOBAL
            groupPriceBuckets.computeIfAbsent("GLOBAL", k -> new java.util.ArrayList<>());
            for (int i = 0; i < qty; i++) groupPriceBuckets.get("GLOBAL").add(unit);
            // CATEGORY
            String catKey = "CATEGORY:" + (product.getCategory() == null ? "" : product.getCategory());
            groupPriceBuckets.computeIfAbsent(catKey, k -> new java.util.ArrayList<>());
            for (int i = 0; i < qty; i++) groupPriceBuckets.get(catKey).add(unit);
        }

        for (CartItem ci : cart.getItems()) {
            Product product = ci.getProduct();
            int qty = ci.getQuantity();
            BigDecimal unit = unitAfterLineDiscount.getOrDefault(product.getId(), product.getPrice());

            BigDecimal lineSubtotal = unit.multiply(BigDecimal.valueOf(qty));

            // Применяем BXGY скидки на уровне продукта
            int bestFree = 0;
            
            // Продуктовые BXGY
            if (product.getDiscounts() != null) {
                for (Discount d : product.getDiscounts()) {
                    if (!d.isActive() || d.getType() != DiscountType.BXGY) continue;
                    int buy = d.getBuyQty() == null ? 0 : d.getBuyQty();
                    int free = d.getFreeQty() == null ? 0 : d.getFreeQty();
                    if (buy > 0 && free > 0) {
                        int group = buy + free;
                        int sets = qty / group;
                        int freebies = sets * free;
                        if (freebies > bestFree) bestFree = freebies;
                    }
                }
            }
            
            // Категорийные BXGY
            if (categoryDiscounts != null) {
                for (Discount d : categoryDiscounts) {
                    if (!d.isActive() || d.getType() != DiscountType.BXGY) continue;
                    if (product.getCategory().equals(d.getCategory())) {
                        int buy = d.getBuyQty() == null ? 0 : d.getBuyQty();
                        int free = d.getFreeQty() == null ? 0 : d.getFreeQty();
                        if (buy > 0 && free > 0) {
                            int group = buy + free;
                            int sets = qty / group;
                            int freebies = sets * free;
                            if (freebies > bestFree) bestFree = freebies;
                        }
                    }
                }
            }
            if (bestFree > 0) {
                BigDecimal discountAmt = unit.multiply(BigDecimal.valueOf(bestFree));
                lineSubtotal = lineSubtotal.subtract(discountAmt);
            }

            OrderItem oi = new OrderItem();
            oi.setOrder(order);
            oi.setProduct(product);
            oi.setQuantity(qty);
            oi.setUnitPrice(unit);
            oi.setSubtotal(lineSubtotal);
            orderItemRepository.save(oi);
            order.getItems().add(oi);
            total = total.add(lineSubtotal);

            // списать со склада
            int oldQty = product.getQuantity();
            product.setQuantity(product.getQuantity() - qty);
            int newQty = product.getQuantity();
            // Если пересекли порог низких остатков — отправить событие в notification-service
            if (oldQty > LOW_STOCK_THRESHOLD && newQty <= LOW_STOCK_THRESHOLD) {
                try {
                    com.example.BulkSales.dto.event.ProductLowStockEvent event = com.example.BulkSales.dto.event.ProductLowStockEvent.builder()
                            .productId(product.getId())
                            .productName(product.getName())
                            .currentQuantity(newQty)
                            .threshold(LOW_STOCK_THRESHOLD)
                            .build();
                    notificationServiceClient.notifyProductLowStock(event);
                    log.info("Low stock notification sent from checkout for product: {} (qty={})", product.getName(), newQty);
                } catch (Exception e) {
                    log.error("Failed to send low stock event from checkout for product {}: {}", product.getId(), e.getMessage());
                }
            }
        }

        BigDecimal groupSavingsMax = BigDecimal.ZERO;
        for (Discount d : activeDiscounts) {
            if (d.getType() != DiscountType.BXGY || d.getScope() == DiscountScope.PRODUCT) continue;
            int buy = d.getBuyQty() == null ? 0 : d.getBuyQty();
            int free = d.getFreeQty() == null ? 0 : d.getFreeQty();
            if (buy <= 0 || free <= 0) continue;
            String key = d.getScope() == DiscountScope.GLOBAL ? "GLOBAL" : ("CATEGORY:" + (d.getCategory() == null ? "" : d.getCategory()));
            java.util.List<BigDecimal> prices = groupPriceBuckets.get(key);
            if (prices == null || prices.isEmpty()) continue;
            // сколько бесплатных позиций
            int totalQty = prices.size();
            int group = buy + free;
            int freebies = (totalQty / group) * free;
            if (freebies <= 0) continue;
            java.util.List<BigDecimal> sorted = new java.util.ArrayList<>(prices);
            sorted.sort(java.util.Comparator.naturalOrder());
            BigDecimal savings = BigDecimal.ZERO;
            for (int i = 0; i < Math.min(freebies, sorted.size()); i++) {
                savings = savings.add(sorted.get(i));
            }
            if (savings.compareTo(groupSavingsMax) > 0) groupSavingsMax = savings;
        }
        if (groupSavingsMax.compareTo(BigDecimal.ZERO) > 0) {
            total = total.subtract(groupSavingsMax);
            if (total.compareTo(BigDecimal.ZERO) < 0) total = BigDecimal.ZERO;
        }

        order.setTotalPrice(total);
        order = orderRepository.save(order);

        // сохранить изменения по продуктам (остатки)
        for (OrderItem oi : order.getItems()) {
            // product внутри oi управляется JPA из CartItem->Product ранее; но на всякий случай сохраняем
            // productRepository.save(oi.getProduct());
        }

        // обновление накопленной суммы пользователя и VIP-статуса
        user.setTotalSpent(user.getTotalSpent().add(total));
        // проверить VIP-порог, если настроен
        try {
            com.example.BulkSales.model.VipSettings cfg = vipSettingsRepository.findById(1L).orElse(null);
            if (cfg != null && cfg.getVipThreshold() != null) {
                if (user.getTotalSpent().compareTo(cfg.getVipThreshold()) >= 0) {
                    user.setVip(true);
                }
            }
        } catch (Exception ignored) {}
        userRepository.save(user);

        // Очистка корзины
        cart.getItems().clear();
        cart.setTotalPrice(BigDecimal.ZERO);
        cartRepository.save(cart);

        return order;
    }

    @Override
    public Order getById(Long orderId) {
        return orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    @Override
    public java.util.List<Order> getByUser(Long userId) {
        return orderRepository.findByUserId(userId);
    }

    @Override
    public java.util.List<Order> getAll() {
        return orderRepository.findAll();
    }

    @Override
    public Order updateStatus(Long orderId, String statusValue) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
        
        // Сохраняем старый статус для уведомления
        String oldStatus = order.getStatus() != null ? order.getStatus().name() : "PENDING";
        
        try {
            OrderStatus newStatus = OrderStatus.valueOf(statusValue);
            order.setStatus(newStatus);
            Order savedOrder = orderRepository.save(order);
            
            // Отправляем событие в notification-service
            try {
                OrderStatusChangedEvent event = OrderStatusChangedEvent.builder()
                        .orderId(savedOrder.getId())
                        .userId(savedOrder.getUser().getId())
                        .oldStatus(oldStatus)
                        .newStatus(newStatus.name())
                        .build();
                
                notificationServiceClient.notifyOrderStatusChanged(event);
                log.info("✅ Sent order status change event to notification-service: Order #{}, {} -> {}",
                        orderId, oldStatus, newStatus);
            } catch (Exception e) {
                // Логируем ошибку, но не прерываем выполнение
                log.error("❌ Failed to send notification for order #{}: {}", orderId, e.getMessage());
            }
            
            return savedOrder;
        } catch (IllegalArgumentException ex) {
            throw new com.example.BulkSales.exceptions.InvalidOperationException("Invalid status value");
        }
    }
}


