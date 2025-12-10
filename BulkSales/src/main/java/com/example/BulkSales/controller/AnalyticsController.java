package com.example.BulkSales.controller;

import com.example.BulkSales.service.AnalyticsService;
import com.example.BulkSales.service.ProductService;
import com.example.BulkSales.service.impl.GroqAIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/analytics")
@CrossOrigin(origins = "*") // Добавляем CORS для фронтенда
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final GroqAIService groqAIService;
    @GetMapping("/top-products")
    public ResponseEntity<Map<String, Object>> getTopProducts(
            @RequestParam(defaultValue = "10") int limit) {
        try {
            System.out.println("API: Getting top products, limit: " + limit);
            List<Map<String, Object>> data = analyticsService.getTopProducts(limit);
            Map<String, Object> response = new HashMap<>();
            response.put("data", data);
            response.put("success", true);
            System.out.println("API: Returning " + data.size() + " products");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("API Error in top-products: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Ошибка при получении топа товаров: " + e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/monthly-sales")
    public ResponseEntity<Map<String, Object>> getMonthlySales(
            @RequestParam(defaultValue = "30") int daysBack) {
        try {
            System.out.println("API: Getting monthly sales for " + daysBack + " days");
            Map<String, Object> data = analyticsService.getMonthlySales(daysBack);
            Map<String, Object> response = new HashMap<>();
            response.put("data", data);
            response.put("success", true);
            System.out.println("API: Monthly sales data prepared");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("API Error in monthly-sales: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Ошибка при получении данных о продажах: " + e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/average-order-value")
    public ResponseEntity<Map<String, Object>> getAverageOrderValue() {
        try {
            System.out.println("API: Getting average order value");
            BigDecimal data = analyticsService.getAverageOrderValue();
            Map<String, Object> response = new HashMap<>();
            response.put("data", data);
            response.put("success", true);
            System.out.println("API: AOV: " + data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("API Error in average-order-value: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Ошибка при расчете среднего чека: " + e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/category-sales")
    public ResponseEntity<Map<String, Object>> getCategorySales(
            @RequestParam(defaultValue = "30") int daysBack) {
        try {
            System.out.println("API: Getting category sales for " + daysBack + " days");
            Map<String, BigDecimal> data = analyticsService.getCategorySales(daysBack);
            Map<String, Object> response = new HashMap<>();
            response.put("data", data);
            response.put("success", true);
            System.out.println("API: Category sales data prepared");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("API Error in category-sales: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Ошибка при получении продаж по категориям: " + e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/vip-share")
    public ResponseEntity<Map<String, Object>> getVipShare(
            @RequestParam(defaultValue = "30") int daysBack) {
        try {
            System.out.println("API: Getting VIP share for " + daysBack + " days");
            Map<String, Long> data = analyticsService.getVipShare(daysBack);
            Map<String, Object> response = new HashMap<>();
            response.put("data", data);
            response.put("success", true);
            System.out.println("API: VIP share data prepared");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("API Error in vip-share: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Ошибка при получении доли VIP: " + e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/total-orders")
    public ResponseEntity<Map<String, Object>> getTotalOrders(
            @RequestParam(defaultValue = "30") int daysBack) {
        try {
            System.out.println("API: Getting total orders for " + daysBack + " days");
            Long data = analyticsService.getTotalOrders(daysBack);
            Map<String, Object> response = new HashMap<>();
            response.put("data", data);
            response.put("success", true);
            System.out.println("API: Total orders: " + data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("API Error in total-orders: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Ошибка при подсчете заказов: " + e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    @GetMapping("/total-revenue")
    public ResponseEntity<Map<String, Object>> getTotalRevenue(
            @RequestParam(defaultValue = "30") int daysBack) {
        try {
            System.out.println("API: Getting total revenue for " + daysBack + " days");
            BigDecimal data = analyticsService.getTotalRevenue(daysBack);
            Map<String, Object> response = new HashMap<>();
            response.put("data", data);
            response.put("success", true);
            System.out.println("API: Total revenue: " + data);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("API Error in total-revenue: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Ошибка при расчете выручки: " + e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    // -------- ABC/XYZ --------
    @GetMapping("/abc")
    public ResponseEntity<Map<String, Object>> getAbc(
            @RequestParam(defaultValue = "90") int daysBack,
            @RequestParam(defaultValue = "80") int a,
            @RequestParam(defaultValue = "15") int b) {
        try {
            Map<String, Object> data = analyticsService.getAbcAnalysis(daysBack, a, b);
            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Ошибка ABC-анализа: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/xyz")
    public ResponseEntity<Map<String, Object>> getXyz(
            @RequestParam(defaultValue = "90") int daysBack,
            @RequestParam(defaultValue = "0.1") double x,
            @RequestParam(defaultValue = "0.25") double y,
            @RequestParam(defaultValue = "WEEK") String bucket,
            @RequestParam(defaultValue = "INCLUDE") String zeroMode) {
        try {
            Map<String, Object> data = analyticsService.getXyzAnalysis(daysBack, x, y, bucket, zeroMode);
            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Ошибка XYZ-анализа: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/abc-xyz")
    public ResponseEntity<Map<String, Object>> getAbcXyz(
            @RequestParam(defaultValue = "90") int daysBack,
            @RequestParam(defaultValue = "80") int a,
            @RequestParam(defaultValue = "15") int b,
            @RequestParam(defaultValue = "0.1") double x,
            @RequestParam(defaultValue = "0.25") double y,
            @RequestParam(defaultValue = "WEEK") String bucket,
            @RequestParam(defaultValue = "INCLUDE") String zeroMode) {
        try {
            Map<String, Object> data = analyticsService.getAbcXyzMatrix(daysBack, a, b, x, y, bucket, zeroMode);
            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "success", false,
                    "error", "Ошибка ABC-XYZ анализа: " + e.getMessage()
            ));
        }
    }

    // ---------- Export CSV ----------
    @GetMapping(value = "/abc/export/csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportAbcCsv(
            @RequestParam(defaultValue = "90") int daysBack,
            @RequestParam(defaultValue = "80") int a,
            @RequestParam(defaultValue = "15") int b) {
        Map<String, Object> data = analyticsService.getAbcAnalysis(daysBack, a, b);
        StringBuilder sb = new StringBuilder();
        sb.append("productId,productName,revenue,share,cumulativeShare,class\n");
        java.util.List<?> items = (java.util.List<?>) data.getOrDefault("items", java.util.List.of());
        for (Object it : items) {
            java.util.Map<?,?> m = (java.util.Map<?,?>) it;
            sb.append(m.get("productId")).append(',')
              .append(escapeCsv(String.valueOf(m.get("productName")))).append(',')
              .append(m.get("revenue")).append(',')
              .append(m.get("share")).append(',')
              .append(m.get("cumulativeShare")).append(',')
              .append(m.get("class")).append('\n');
        }
        return csvResponse(sb.toString(), "abc.csv");
    }

    @GetMapping(value = "/xyz/export/csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportXyzCsv(
            @RequestParam(defaultValue = "90") int daysBack,
            @RequestParam(defaultValue = "0.1") double x,
            @RequestParam(defaultValue = "0.25") double y) {
        Map<String, Object> data = analyticsService.getXyzAnalysis(daysBack, x, y, "WEEK", "INCLUDE");
        StringBuilder sb = new StringBuilder();
        sb.append("productId,productName,cv,meanQty,stdQty,days,class\n");
        java.util.List<?> items = (java.util.List<?>) data.getOrDefault("items", java.util.List.of());
        for (Object it : items) {
            java.util.Map<?,?> m = (java.util.Map<?,?>) it;
            sb.append(m.get("productId")).append(',')
              .append(escapeCsv(String.valueOf(m.get("productName")))).append(',')
              .append(m.get("cv")).append(',')
              .append(m.get("meanQty")).append(',')
              .append(m.get("stdQty")).append(',')
              .append(m.get("days")).append(',')
              .append(m.get("class")).append('\n');
        }
        return csvResponse(sb.toString(), "xyz.csv");
    }

    @GetMapping(value = "/abc-xyz/export/csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportMatrixCsv(
            @RequestParam(defaultValue = "90") int daysBack,
            @RequestParam(defaultValue = "80") int a,
            @RequestParam(defaultValue = "15") int b,
            @RequestParam(defaultValue = "0.1") double x,
            @RequestParam(defaultValue = "0.25") double y) {
        Map<String, Object> mx = analyticsService.getAbcXyzMatrix(daysBack, a, b, x, y, "WEEK", "INCLUDE");
        java.util.Map<?,?> matrix = (java.util.Map<?,?>) mx.getOrDefault("matrix", java.util.Map.of());
        StringBuilder sb = new StringBuilder();
        sb.append("bucket,count\n");
        for (var entry : matrix.entrySet()) {
            sb.append(entry.getKey()).append(',').append(entry.getValue()).append('\n');
        }
        return csvResponse(sb.toString(), "abc_xyz_matrix.csv");
    }

    // ---------- Export Excel (combined workbook) ----------
    @GetMapping(value = "/abc-xyz/export/excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportAbcXyzExcel(
            @RequestParam(defaultValue = "90") int daysBack,
            @RequestParam(defaultValue = "80") int a,
            @RequestParam(defaultValue = "15") int b,
            @RequestParam(defaultValue = "0.1") double x,
            @RequestParam(defaultValue = "0.25") double y) {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream()) {
            var abc = analyticsService.getAbcAnalysis(daysBack, a, b);
            var xyz = analyticsService.getXyzAnalysis(daysBack, x, y, "WEEK", "INCLUDE");
            var mx = analyticsService.getAbcXyzMatrix(daysBack, a, b, x, y, "WEEK", "INCLUDE");

            // ABC sheet
            var shA = wb.createSheet("ABC");
            int r = 0;
            var row = shA.createRow(r++); int c=0;
            row.createCell(c++).setCellValue("productId");
            row.createCell(c++).setCellValue("productName");
            row.createCell(c++).setCellValue("revenue");
            row.createCell(c++).setCellValue("share");
            row.createCell(c++).setCellValue("cumulativeShare");
            row.createCell(c++).setCellValue("class");
            for (Object it : (java.util.List<?>) abc.getOrDefault("items", java.util.List.of())) {
                var m = (java.util.Map<?,?>) it; c=0; row = shA.createRow(r++);
                row.createCell(c++).setCellValue(String.valueOf(m.get("productId")));
                row.createCell(c++).setCellValue(String.valueOf(m.get("productName")));
                row.createCell(c++).setCellValue(asDouble(m.get("revenue")));
                row.createCell(c++).setCellValue(asDouble(m.get("share")));
                row.createCell(c++).setCellValue(asDouble(m.get("cumulativeShare")));
                row.createCell(c++).setCellValue(String.valueOf(m.get("class")));
            }

            // XYZ sheet
            var shX = wb.createSheet("XYZ");
            r = 0; row = shX.createRow(r++); c=0;
            row.createCell(c++).setCellValue("productId");
            row.createCell(c++).setCellValue("productName");
            row.createCell(c++).setCellValue("cv");
            row.createCell(c++).setCellValue("meanQty");
            row.createCell(c++).setCellValue("stdQty");
            row.createCell(c++).setCellValue("days");
            row.createCell(c++).setCellValue("class");
            for (Object it : (java.util.List<?>) xyz.getOrDefault("items", java.util.List.of())) {
                var m = (java.util.Map<?,?>) it; c=0; row = shX.createRow(r++);
                row.createCell(c++).setCellValue(String.valueOf(m.get("productId")));
                row.createCell(c++).setCellValue(String.valueOf(m.get("productName")));
                row.createCell(c++).setCellValue(asDouble(m.get("cv")));
                row.createCell(c++).setCellValue(asDouble(m.get("meanQty")));
                row.createCell(c++).setCellValue(asDouble(m.get("stdQty")));
                row.createCell(c++).setCellValue(asDouble(m.get("days")));
                row.createCell(c++).setCellValue(String.valueOf(m.get("class")));
            }

            // Matrix sheet
            var shM = wb.createSheet("Matrix");
            r = 0; row = shM.createRow(r++); c=0;
            row.createCell(c++).setCellValue("bucket");
            row.createCell(c++).setCellValue("count");
            var matrix = (java.util.Map<?,?>) mx.getOrDefault("matrix", java.util.Map.of());
            for (var entry : matrix.entrySet()) {
                c=0; row = shM.createRow(r++);
                row.createCell(c++).setCellValue(String.valueOf(entry.getKey()));
                row.createCell(c++).setCellValue(asDouble(entry.getValue()));
            }

            wb.write(bos);
            byte[] bytes = bos.toByteArray();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=abc_xyz.xlsx");
            headers.set(org.springframework.http.HttpHeaders.CONTENT_LENGTH, String.valueOf(bytes.length));
            return new ResponseEntity<>(bytes, headers, org.springframework.http.HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private static double asDouble(Object v) {
        if (v == null) return 0.0;
        if (v instanceof Number n) return n.doubleValue();
        try { return Double.parseDouble(String.valueOf(v)); } catch (Exception e) { return 0.0; }
    }

    private static ResponseEntity<byte[]> csvResponse(String content, String filename) {
        byte[] bytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        headers.set(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + filename);
        headers.set(org.springframework.http.HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8");
        headers.set(org.springframework.http.HttpHeaders.CONTENT_LENGTH, String.valueOf(bytes.length));
        return new ResponseEntity<>(bytes, headers, org.springframework.http.HttpStatus.OK);
    }

    private static String escapeCsv(String s) {
        if (s == null) return "";
        boolean needQuotes = s.contains(",") || s.contains("\n") || s.contains("\"");
        String out = s.replace("\"", "\"\"");
        return needQuotes ? ("\"" + out + "\"") : out;
    }


    @GetMapping("/ai-recommendations")
    public ResponseEntity<Map<String, Object>> getAIRecommendations() {
        try {
            String recsText = groqAIService.getRecommendations();

            // Разбиваем текст на строки для фронтенда
            List<String> recList = Arrays.stream(recsText.split("\n"))
                    .filter(s -> !s.isBlank())
                    .map(String::trim)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("data", recList);
            response.put("success", true);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Ошибка при получении ИИ-рекомендаций: " + e.getMessage());
            errorResponse.put("success", false);
            return ResponseEntity.internalServerError().body(errorResponse);
        }
    }

    // Тестовый эндпоинт для проверки связи
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> test() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Analytics API is working!");
        response.put("success", true);
        response.put("timestamp", System.currentTimeMillis());
        return ResponseEntity.ok(response);
    }
}