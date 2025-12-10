package com.example.BulkSales.config;

import com.example.BulkSales.model.Discount;
import com.example.BulkSales.model.DiscountScope;
import com.example.BulkSales.model.DiscountType;
import com.example.BulkSales.model.Order;
import com.example.BulkSales.model.OrderItem;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.repository.DiscountRepository;
import com.example.BulkSales.repository.OrderRepository;
import com.example.BulkSales.repository.ProductRepository;
import com.example.BulkSales.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class ScheduledTasks {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final DiscountRepository discountRepository;
    private final NotificationRepository notificationRepository;

    // Ежедневно в 03:00 — отчёт по складу и динамическое ценообразование
    @Scheduled(cron = "0 0 3 * * *")
    public void dailyMerchOps() {
        try {
            inventoryReport();
            demandPricing();
        } catch (Exception e) {
            log.warn("Daily merch ops failed: {}", e.getMessage());
        }
    }

    private void inventoryReport() {
        List<Product> all = productRepository.findAll();
        List<Product> lowList = all.stream().filter(p -> (p.getQuantity()==null?0:p.getQuantity()) <= 5).toList();
        List<Product> overList = all.stream().filter(p -> (p.getQuantity()==null?0:p.getQuantity()) >= 500).toList();
        log.info("Inventory report: lowStock={}, overStock={}", lowList.size(), overList.size());
        if (!lowList.isEmpty()) {
            notificationRepository.save(
                    com.example.BulkSales.model.Notification.builder()
                            .title("Низкие остатки")
                            .message("Товаров с низким остатком: " + lowList.size())
                            .severity(com.example.BulkSales.model.Notification.Severity.WARNING)
                            .build()
            );
        }
        if (!overList.isEmpty()) {
            notificationRepository.save(
                    com.example.BulkSales.model.Notification.builder()
                            .title("Избыточные запасы")
                            .message("Товаров с избыточным остатком: " + overList.size())
                            .severity(com.example.BulkSales.model.Notification.Severity.INFO)
                            .build()
            );
        }
    }

    private void demandPricing() {
        LocalDate now = LocalDate.now();
        YearMonth startYm = YearMonth.from(now).minusMonths(1);
        LocalDateTime start = startYm.atDay(1).atStartOfDay();
        LocalDateTime end = YearMonth.from(now).atEndOfMonth().atTime(23,59,59);
        List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);
        Map<Long, Integer> sales = new HashMap<>();
        for (Order o : orders) for (OrderItem it : o.getItems()) sales.merge(it.getProduct().getId(), it.getQuantity(), Integer::sum);

        // Продвинутая логика: рассчитываем velocity и DOH
        for (Product p : productRepository.findAll()) {
            int sold = sales.getOrDefault(p.getId(), 0);
            int stock = p.getQuantity() == null ? 0 : p.getQuantity();
            double days = Math.max(1, java.time.Duration.between(start, end).toDays());
            double velocity = sold / days; // шт/день
            double doh = velocity > 0 ? stock / velocity : (stock > 0 ? 9999 : 0); // дни покрытия

            java.math.BigDecimal targetPercent = java.math.BigDecimal.ZERO;
            String reason;
            if (velocity == 0 && stock > 0) {
                targetPercent = new BigDecimal("20"); reason = "Нет продаж, большой остаток";
            } else if (doh > 120) {
                targetPercent = new BigDecimal("15"); reason = "Высокий DOH";
            } else if (doh > 60) {
                targetPercent = new BigDecimal("10"); reason = "Средний DOH";
            } else if (doh < 7 && stock < 5) {
                targetPercent = new BigDecimal("0"); reason = "Дефицит — без скидки";
            } else {
                targetPercent = new BigDecimal("5"); reason = "Базовая корректировка";
            }

            Discount existing = discountRepository.findAll().stream()
                    .filter(d -> d.getProduct()!=null && d.getProduct().getId().equals(p.getId()))
                    .filter(d -> "Auto Demand Pricing".equalsIgnoreCase(d.getName()))
                    .findFirst().orElse(null);

            if (targetPercent.compareTo(BigDecimal.ZERO) > 0) {
                if (existing == null) {
                    existing = new Discount();
                    existing.setName("Auto Demand Pricing");
                    existing.setType(DiscountType.PERCENT);
                    existing.setScope(DiscountScope.PRODUCT);
                    existing.setProduct(p);
                }
                existing.setPercent(targetPercent);
                discountRepository.save(existing);
                notificationRepository.save(
                        com.example.BulkSales.model.Notification.builder()
                                .title("Обновление скидки спроса")
                                .message(p.getName()+": "+targetPercent+"% ("+reason+")")
                                .severity(com.example.BulkSales.model.Notification.Severity.INFO)
                                .build()
                );
            } else if (existing != null) {
                existing.setPercent(BigDecimal.ZERO);
                discountRepository.save(existing);
            }
        }
        log.info("Demand pricing evaluated for {} products", productRepository.count());
    }
}