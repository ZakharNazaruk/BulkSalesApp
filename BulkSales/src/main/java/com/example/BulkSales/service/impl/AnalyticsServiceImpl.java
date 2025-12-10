package com.example.BulkSales.service.impl;

import com.example.BulkSales.model.Order;
import com.example.BulkSales.model.OrderItem;
import com.example.BulkSales.model.User;
import com.example.BulkSales.repository.OrderRepository;
import com.example.BulkSales.repository.ProductRepository;
import com.example.BulkSales.repository.UserRepository;
import com.example.BulkSales.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class AnalyticsServiceImpl implements AnalyticsService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Override
    public List<Map<String, Object>> getTopProducts(int limit) {
        System.out.println("Getting top products, limit: " + limit);

        Map<Long, BigDecimal> productRevenue = new HashMap<>();

        // Получаем все заказы
        List<Order> allOrders = orderRepository.findAll();
        System.out.println("Total orders found: " + allOrders.size());

        for (Order order : allOrders) {
            for (OrderItem item : order.getItems()) {
                Long productId = item.getProduct().getId();
                BigDecimal itemRevenue = item.getSubtotal();
                productRevenue.merge(productId, itemRevenue, BigDecimal::add);
            }
        }

        System.out.println("Products with revenue: " + productRevenue.size());

        List<Map<String, Object>> result = productRevenue.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(limit)
                .map(e -> {
                    Map<String, Object> productData = new HashMap<>();
                    Long productId = e.getKey();

                    // Базовая информация
                    productData.put("productId", productId);
                    productData.put("revenue", e.getValue());
                    productData.put("total", e.getValue().doubleValue());
                    productData.put("amount", e.getValue().doubleValue());

                    // Информация о продукте
                    try {
                        var product = productRepository.findById(productId).orElse(null);
                        if (product != null) {
                            productData.put("productName", product.getName());
                            productData.put("imageUrl", product.getImageUrl());
                            productData.put("category", product.getCategory() != null ? product.getCategory() : "Без категории");
                            productData.put("price", product.getPrice());

                            // Полный объект продукта
                            Map<String, Object> productObj = new HashMap<>();
                            productObj.put("id", product.getId());
                            productObj.put("name", product.getName());
                            productObj.put("price", product.getPrice());
                            productObj.put("category", product.getCategory());
                            productObj.put("imageUrl", product.getImageUrl());
                            productData.put("product", productObj);
                        } else {
                            // Запасные значения если продукт не найден
                            productData.put("productName", "Товар #" + productId);
                            productData.put("category", "Неизвестно");
                            productData.put("price", BigDecimal.ZERO);

                            Map<String, Object> productObj = new HashMap<>();
                            productObj.put("id", productId);
                            productObj.put("name", "Товар #" + productId);
                            productObj.put("price", BigDecimal.ZERO);
                            productObj.put("category", "Неизвестно");
                            productData.put("product", productObj);
                        }
                    } catch (Exception ex) {
                        System.err.println("Error loading product " + productId + ": " + ex.getMessage());
                        // Минимальная информация при ошибке
                        productData.put("productName", "Товар #" + productId);
                        productData.put("category", "Ошибка загрузки");
                    }

                    return productData;
                })
                .collect(Collectors.toList());

        System.out.println("Returning " + result.size() + " top products");
        return result;
    }

    @Override
    public Map<String, Object> getMonthlySales(int daysBack) {
        System.out.println("Getting monthly sales for " + daysBack + " days");

        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(daysBack);

        List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);
        System.out.println("Orders in period: " + orders.size());

        Map<String, Object> result = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM");

        // Генерируем все даты в диапазоне
        LocalDateTime currentDate = start;
        while (!currentDate.isAfter(end)) {
            String dateKey = currentDate.format(formatter);
            Map<String, Object> dayData = new HashMap<>();
            dayData.put("revenue", BigDecimal.ZERO);
            dayData.put("orders", BigDecimal.ZERO);
            dayData.put("count", BigDecimal.ZERO); // для совместимости
            result.put(dateKey, dayData);
            currentDate = currentDate.plusDays(1);
        }

        // Заполняем реальными данными
        for (Order order : orders) {
            String dateKey = order.getCreatedAt().format(formatter);
            Map<String, Object> dayData = (Map<String, Object>) result.get(dateKey);
            if (dayData != null) {
                BigDecimal currentRevenue = (BigDecimal) dayData.get("revenue");
                BigDecimal currentOrders = (BigDecimal) dayData.get("orders");

                dayData.put("revenue", currentRevenue.add(order.getTotalPrice()));
                dayData.put("orders", currentOrders.add(BigDecimal.ONE));
                dayData.put("count", currentOrders.add(BigDecimal.ONE));
            }
        }

        System.out.println("Monthly sales data points: " + result.size());
        return result;
    }

    @Override
    public BigDecimal getAverageOrderValue() {
        System.out.println("Calculating average order value");

        List<Order> orders = orderRepository.findAll();
        if (orders.isEmpty()) {
            System.out.println("No orders found, returning 0");
            return BigDecimal.ZERO;
        }

        BigDecimal sum = orders.stream()
                .map(Order::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal avg = sum.divide(BigDecimal.valueOf(orders.size()), BigDecimal.ROUND_HALF_UP);
        System.out.println("AOV calculated: " + avg);

        return avg;
    }

    @Override
    public Map<String, BigDecimal> getCategorySales(int daysBack) {
        System.out.println("Getting category sales for " + daysBack + " days");

        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(daysBack);

        List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);
        Map<String, BigDecimal> result = new HashMap<>();

        for (Order order : orders) {
            for (OrderItem item : order.getItems()) {
                String category = "Без категории";
                if (item.getProduct() != null && item.getProduct().getCategory() != null) {
                    category = item.getProduct().getCategory();
                }
                result.merge(category, item.getSubtotal(), BigDecimal::add);
            }
        }

        System.out.println("Categories found: " + result.size());
        return result;
    }

    @Override
    public Map<String, Long> getVipShare(int daysBack) {
        System.out.println("Getting VIP share for " + daysBack + " days");

        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(daysBack);

        List<User> users = userRepository.findByCreatedAtBetween(start, end);
        long vipCount = 0;
        long nonVipCount = 0;

        for (User user : users) {
            boolean isVip = user.isVip();
            if (isVip) {
                vipCount++;
            } else {
                nonVipCount++;
            }
        }

        Map<String, Long> result = new LinkedHashMap<>();
        result.put("VIP", vipCount);
        result.put("NON_VIP", nonVipCount);

        System.out.println("VIP share - VIP: " + vipCount + ", NON_VIP: " + nonVipCount);
        return result;
    }

    @Override
    public Long getTotalOrders(int daysBack) {
        System.out.println("Getting total orders for " + daysBack + " days");

        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(daysBack);
        long count = orderRepository.countByCreatedAtBetween(start, end);

        System.out.println("Total orders: " + count);
        return count;
    }

    @Override
    public BigDecimal getTotalRevenue(int daysBack) {
        System.out.println("Getting total revenue for " + daysBack + " days");

        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(daysBack);

        List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);
        BigDecimal revenue = orders.stream()
                .map(Order::getTotalPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        System.out.println("Total revenue: " + revenue);
        return revenue;
    }

    // ===================== ABC / XYZ =====================

    @Override
    public Map<String, Object> getAbcAnalysis(int daysBack, int aPercent, int bPercent) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(daysBack);
        List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);

        Map<Long, BigDecimal> revenueByProduct = new HashMap<>();
        Map<Long, String> productNames = new HashMap<>();
        for (Order o : orders) {
            for (OrderItem it : o.getItems()) {
                Long pid = it.getProduct().getId();
                revenueByProduct.merge(pid, it.getSubtotal(), BigDecimal::add);
                if (!productNames.containsKey(pid)) {
                    try { productNames.put(pid, it.getProduct().getName()); } catch (Exception ignored) {}
                }
            }
        }
        BigDecimal totalRevenue = revenueByProduct.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        List<Map.Entry<Long, BigDecimal>> sorted = revenueByProduct.entrySet().stream()
                .sorted((a,b)->b.getValue().compareTo(a.getValue()))
                .toList();

        double aCut = aPercent / 100.0;
        double bCut = bPercent / 100.0;
        List<Map<String,Object>> items = new ArrayList<>();
        BigDecimal cumulative = BigDecimal.ZERO;
        for (Map.Entry<Long, BigDecimal> e : sorted) {
            BigDecimal rev = e.getValue();
            cumulative = cumulative.add(rev);
            double share = totalRevenue.signum()==0 ? 0.0 : rev.doubleValue() / totalRevenue.doubleValue();
            double cumShare = totalRevenue.signum()==0 ? 0.0 : cumulative.doubleValue() / totalRevenue.doubleValue();
            String cls;
            if (cumShare <= aCut) cls = "A";
            else if (cumShare <= aCut + bCut) cls = "B";
            else cls = "C";
            Map<String,Object> row = new HashMap<>();
            row.put("productId", e.getKey());
            row.put("productName", productNames.getOrDefault(e.getKey(), "#"+e.getKey()));
            row.put("revenue", rev);
            row.put("share", share);
            row.put("cumulativeShare", cumShare);
            row.put("class", cls);
            items.add(row);
        }
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("totalRevenue", totalRevenue);
        out.put("thresholds", Map.of("A", aPercent, "B", bPercent, "C", 100 - aPercent - bPercent));
        out.put("items", items);
        return out;
    }

    @Override
    public Map<String, Object> getXyzAnalysis(int daysBack, double xThreshold, double yThreshold) {
        // Default to WEEK aggregation, INCLUDE zeros for backward compatibility of endpoint behavior
        return getXyzAnalysis(daysBack, xThreshold, yThreshold, "WEEK", "INCLUDE");
    }

    @Override
    public Map<String, Object> getXyzAnalysis(int daysBack, double xThreshold, double yThreshold, String bucket, String zeroMode) {
        LocalDateTime end = LocalDateTime.now();
        LocalDateTime start = end.minusDays(daysBack);
        List<Order> orders = orderRepository.findByCreatedAtBetween(start, end);

        boolean weekly = "WEEK".equalsIgnoreCase(bucket);
        boolean excludeZeros = "EXCLUDE".equalsIgnoreCase(zeroMode);

        // Build ordered buckets
        List<String> buckets = new ArrayList<>();
        Map<String, java.time.LocalDate> bucketToDate = new LinkedHashMap<>();
        if (weekly) {
            java.time.LocalDate s = start.toLocalDate();
            // align to Monday
            java.time.DayOfWeek dow = s.getDayOfWeek();
            int shift = (dow.getValue()+6)%7; // 0 for Monday
            s = s.minusDays(shift);
            java.time.LocalDate cur = s;
            while (!cur.isAfter(end.toLocalDate())) {
                String key = cur.toString();
                buckets.add(key);
                bucketToDate.put(key, cur);
                cur = cur.plusWeeks(1);
            }
        } else {
            for (int i = 0; i <= daysBack; i++) {
                java.time.LocalDate d = end.toLocalDate().minusDays(daysBack - i);
                String key = d.toString();
                buckets.add(key);
                bucketToDate.put(key, d);
            }
        }

        // Aggregate quantities per product per bucket
        Map<Long, String> productNames = new HashMap<>();
        Map<Long, Map<String, Integer>> qtyByProductByBucket = new HashMap<>();
        for (Order o : orders) {
            java.time.LocalDate d = o.getCreatedAt().toLocalDate();
            String bkey;
            if (weekly) {
                // week bucket key is Monday of that week
                java.time.DayOfWeek dow = d.getDayOfWeek();
                int shift = (dow.getValue()+6)%7; // 0 for Monday
                java.time.LocalDate monday = d.minusDays(shift);
                bkey = monday.toString();
            } else {
                bkey = d.toString();
            }
            for (OrderItem it : o.getItems()) {
                Long pid = it.getProduct().getId();
                productNames.putIfAbsent(pid, it.getProduct().getName());
                qtyByProductByBucket.computeIfAbsent(pid, k -> new HashMap<>());
                qtyByProductByBucket.get(pid).merge(bkey, it.getQuantity(), Integer::sum);
            }
        }

        List<Map<String,Object>> items = new ArrayList<>();
        for (Map.Entry<Long, Map<String, Integer>> e : qtyByProductByBucket.entrySet()) {
            Long pid = e.getKey();
            // Build series by buckets order
            List<Double> seq = new ArrayList<>();
            for (String key : buckets) {
                int v = e.getValue().getOrDefault(key, 0);
                if (excludeZeros && v == 0) continue;
                seq.add((double) v);
            }
            double mean;
            double std;
            int n = seq.size();
            if (n == 0) {
                mean = 0.0; std = 0.0;
            } else if (n == 1) {
                mean = seq.get(0);
                std = 0.0; // дисперсия по выборке не определена; считаем 0
            } else {
                mean = seq.stream().mapToDouble(dv -> dv).average().orElse(0.0);
                double m = mean;
                double ss = seq.stream().mapToDouble(dv -> (dv - m) * (dv - m)).sum();
                // выборочная дисперсия (n-1)
                double variance = ss / (n - 1);
                std = Math.sqrt(variance);
            }
            double cv = mean > 0 ? (std / mean) : (seq.stream().mapToDouble(Double::doubleValue).sum() > 0 ? 1.0 : 0.0);
            String cls = cv <= xThreshold ? "X" : (cv <= yThreshold ? "Y" : "Z");
            Map<String,Object> row = new HashMap<>();
            row.put("productId", pid);
            row.put("productName", productNames.getOrDefault(pid, "#"+pid));
            row.put("meanQty", mean);
            row.put("stdQty", std);
            row.put("cv", cv);
            row.put("class", cls);
            row.put("buckets", n);
            row.put("bucketType", weekly ? "WEEK" : "DAY");
            row.put("zeroMode", excludeZeros ? "EXCLUDE" : "INCLUDE");
            items.add(row);
        }
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("thresholds", Map.of("X", xThreshold, "Y", yThreshold));
        out.put("items", items);
        return out;
    }

    @Override
    public Map<String, Object> getAbcXyzMatrix(int daysBack, int aPercent, int bPercent, double xThreshold, double yThreshold) {
        return getAbcXyzMatrix(daysBack, aPercent, bPercent, xThreshold, yThreshold, "WEEK", "INCLUDE");
    }

    @Override
    public Map<String, Object> getAbcXyzMatrix(int daysBack, int aPercent, int bPercent, double xThreshold, double yThreshold, String bucket, String zeroMode) {
        Map<String, Object> abc = getAbcAnalysis(daysBack, aPercent, bPercent);
        Map<String, Object> xyz = getXyzAnalysis(daysBack, xThreshold, yThreshold, bucket, zeroMode);
        Map<Long, String> abcByPid = new HashMap<>();
        for (Object obj : (List<?>) abc.getOrDefault("items", List.of())) {
            Map<?,?> m = (Map<?,?>) obj;
            abcByPid.put(((Number)m.get("productId")).longValue(), String.valueOf(m.get("class")));
        }
        Map<Long, String> xyzByPid = new HashMap<>();
        Map<Long, Double> cvByPid = new HashMap<>();
        for (Object obj : (List<?>) xyz.getOrDefault("items", List.of())) {
            Map<?,?> m = (Map<?,?>) obj;
            Long pid = ((Number)m.get("productId")).longValue();
            xyzByPid.put(pid, String.valueOf(m.get("class")));
            Object cv = m.get("cv");
            if (cv instanceof Number) cvByPid.put(pid, ((Number) cv).doubleValue());
        }
        Map<String, Integer> matrix = new LinkedHashMap<>();
        String[] a = {"A","B","C"}; String[] x = {"X","Y","Z"};
        for (String aa: a) for (String xx: x) matrix.put(aa+xx, 0);
        List<Map<String,Object>> items = new ArrayList<>();
        for (Map.Entry<Long, String> e : abcByPid.entrySet()) {
            Long pid = e.getKey();
            String aCls = e.getValue();
            String xCls = xyzByPid.getOrDefault(pid, "Z");
            String key = aCls + xCls;
            matrix.computeIfPresent(key, (k,v)->v+1);
            Map<String,Object> row = new HashMap<>();
            row.put("productId", pid);
            row.put("abc", aCls);
            row.put("xyz", xCls);
            row.put("cv", cvByPid.getOrDefault(pid, 0.0));
            items.add(row);
        }
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("matrix", matrix);
        out.put("items", items);
        out.put("abcThresholds", Map.of("A", aPercent, "B", bPercent));
        out.put("xyzThresholds", Map.of("X", xThreshold, "Y", yThreshold));
        return out;
    }
}
