package com.example.BulkSales.controller;

import com.example.BulkSales.model.Order;
import com.example.BulkSales.model.OrderItem;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.repository.OrderRepository;
import com.example.BulkSales.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/merch")
public class MerchandisingController {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;

    // Ассортимент: рекомендация уменьшить/расширить (за последние monthsBack месяцев)
    @GetMapping("/assortment/recommendations")
    public Map<String, Object> assortment(@RequestParam(defaultValue = "3") int monthsBack,
                                          @RequestParam(defaultValue = "2") int lowSalesThreshold,
                                          @RequestParam(defaultValue = "10") int expandTopN) {
        LocalDate now = LocalDate.now();
        YearMonth startYm = YearMonth.from(now).minusMonths(monthsBack - 1L);
        LocalDateTime start = startYm.atDay(1).atStartOfDay();
        LocalDateTime end = YearMonth.from(now).atEndOfMonth().atTime(23,59,59);
        List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);

        Map<Long, Integer> salesCount = new HashMap<>();
        for (Order o : orders) {
            for (OrderItem it : o.getItems()) {
                salesCount.merge(it.getProduct().getId(), it.getQuantity(), Integer::sum);
            }
        }
        List<Product> all = productRepository.findAll();
        List<Map<String, Object>> reduce = new ArrayList<>();
        List<Map<String, Object>> expand = new ArrayList<>();

        for (Product p : all) {
            int cnt = salesCount.getOrDefault(p.getId(), 0);
            if (cnt <= lowSalesThreshold) {
                reduce.add(Map.of("productId", p.getId(), "name", p.getName(), "sales", cnt));
            }
        }
        // Топ продаваемые по категориям (к расширению)
        Map<String, Integer> catSales = new HashMap<>();
        for (Map.Entry<Long, Integer> e : salesCount.entrySet()) {
            productRepository.findById(e.getKey()).ifPresent(pr -> catSales.merge(pr.getCategory(), e.getValue(), Integer::sum));
        }
        List<Map.Entry<String, Integer>> topCats = catSales.entrySet().stream()
                .sorted((a,b)->Integer.compare(b.getValue(), a.getValue()))
                .limit(expandTopN)
                .toList();
        for (var en : topCats) {
            expand.add(Map.of("category", en.getKey(), "sales", en.getValue()));
        }
        return Map.of("reduce", reduce, "expand", expand);
    }

    // Контроль запасов: простые алерты по остаткам
    @GetMapping("/inventory/alerts")
    public Map<String, Object> inventoryAlerts(@RequestParam(defaultValue = "5") int low,
                                               @RequestParam(defaultValue = "500") int over) {
        List<Product> all = productRepository.findAll();

        List<Map<String, Object>> lowList = all.stream()
                .filter(p -> (p.getQuantity() != null ? p.getQuantity() : 0) <= low)
                .map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("productId", p.getId());
                    m.put("name", p.getName());
                    m.put("quantity", p.getQuantity());
                    return m;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> overList = all.stream()
                .filter(p -> (p.getQuantity() != null ? p.getQuantity() : 0) >= over)
                .map(p -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("productId", p.getId());
                    m.put("name", p.getName());
                    m.put("quantity", p.getQuantity());
                    return m;
                })
                .collect(Collectors.toList());

        return Map.of("lowStock", lowList, "overStock", overList);
    }

}