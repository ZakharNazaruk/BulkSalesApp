package com.example.BulkSales.controller;

import com.example.BulkSales.model.*;
import com.example.BulkSales.repository.*;
import com.example.BulkSales.service.impl.GroqAIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/planogram-analysis")
@CrossOrigin(origins = "*")
public class PlanogramAnalysisController {

    private final FloorplanRepository floorplanRepository;
    private final ShelfRepository shelfRepository;
    private final ProductRepository productRepository;
    private final ShelfTypeRepository shelfTypeRepository;
    private final ShelfCellRepository shelfCellRepository;
    private final GroqAIService groqAIService;

    @GetMapping("/analyze/{floorplanId}")
    public ResponseEntity<Map<String, Object>> analyzePlanogram(@PathVariable Long floorplanId) {
        try {
            Floorplan floorplan = floorplanRepository.findById(floorplanId)
                    .orElseThrow(() -> new RuntimeException("Floorplan not found"));

            Map<String, Object> analysis = generatePlanogramAnalysis(floorplan);
            return ResponseEntity.ok(analysis);

        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to analyze planogram: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    private Map<String, Object> generatePlanogramAnalysis(Floorplan floorplan) {
        Map<String, Object> analysis = new HashMap<>();

        // Собираем данные
        List<Shelf> shelves = shelfRepository.findByFloorplanId(floorplan.getId());
        List<Product> allProducts = productRepository.findAll();

        // Базовые метрики
        Map<String, Object> metrics = calculateBasicMetrics(floorplan, shelves, allProducts);
        analysis.put("metrics", metrics);

        // Локальные рекомендации
        List<Map<String, Object>> localRecommendations = generateLocalRecommendations(metrics, shelves, allProducts);
        analysis.put("localRecommendations", localRecommendations);

        // AI рекомендации от Groq
        String aiInsights = generateAiInsights(floorplan, shelves, allProducts, metrics);
        analysis.put("aiInsights", aiInsights);

        // Общая оценка
        analysis.put("optimizationScore", calculateOptimizationScore(metrics));
        analysis.put("timestamp", new Date().toString());
        analysis.put("summary", generateSummary(metrics, localRecommendations));

        return analysis;
    }

    private String generateAiInsights(Floorplan floorplan, List<Shelf> shelves, List<Product> allProducts, Map<String, Object> metrics) {
        try {
            // Формируем структурированные данные для AI
            String planogramData = buildPlanogramDataForAI(floorplan, shelves, allProducts, metrics);

            // Готовим промпт для AI
            String systemPrompt = buildAiSystemPrompt();
            String userPrompt = buildAiUserPrompt(planogramData);

            // Логируем данные для отладки
            System.out.println("=== AI ANALYSIS DATA ===");
            System.out.println(planogramData);
            System.out.println("========================");

            // Получаем рекомендации от Groq AI
            String aiResponse = getAiRecommendations(systemPrompt, userPrompt);

            if (isValidAiResponse(aiResponse)) {
                return formatAiResponse(aiResponse);
            } else {
                throw new RuntimeException("Invalid AI response");
            }

        } catch (Exception e) {
            System.err.println("AI analysis failed, using fallback: " + e.getMessage());
            // Fallback на локальные рекомендации
            return generateLocalAiInsights(metrics, shelves);
        }
    }

    private String buildPlanogramDataForAI(Floorplan floorplan, List<Shelf> shelves, List<Product> allProducts, Map<String, Object> metrics) {
        StringBuilder data = new StringBuilder();

        data.append("ДАННЫЕ ПЛАНОГРАММЫ ДЛЯ АНАЛИЗА\n\n");

        // Основная информация
        data.append("ОСНОВНАЯ ИНФОРМАЦИЯ:\n");
        data.append("• Название планограммы: ").append(floorplan.getName()).append("\n");
        data.append("• Размеры помещения: ").append(floorplan.getWidth()).append("x").append(floorplan.getHeight()).append("px\n");
        data.append("• Количество стеллажей: ").append(shelves.size()).append("\n");
        data.append("• Общее количество товаров в базе: ").append(allProducts.size()).append("\n\n");

        // Метрики эффективности
        data.append("МЕТРИКИ ЭФФЕКТИВНОСТИ:\n");
        data.append("• Заполненность полок: ").append(metrics.get("utilization")).append("\n");
        data.append("• Использование площади: ").append(metrics.get("areaUtilization")).append("\n");
        data.append("• Заполнено ячеек: ").append(metrics.get("filledCells")).append("/").append(metrics.get("totalCells")).append("\n");
        data.append("• Используемая площадь: ").append(metrics.get("usedArea")).append("/").append(metrics.get("totalArea")).append("px²\n\n");

        // Распределение по категориям
        Map<String, Integer> categoryDist = (Map<String, Integer>) metrics.get("categoryDistribution");
        if (!categoryDist.isEmpty()) {
            data.append("РАСПРЕДЕЛЕНИЕ ПО КАТЕГОРИЯМ:\n");
            categoryDist.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .forEach(entry -> {
                        data.append("• ").append(entry.getKey()).append(": ").append(entry.getValue()).append(" позиций\n");
                    });
            data.append("\n");
        }

        // Информация о стеллажах
        if (!shelves.isEmpty()) {
            data.append("ИНФОРМАЦИЯ О СТЕЛЛАЖАХ:\n");
            for (int i = 0; i < Math.min(shelves.size(), 5); i++) {
                Shelf shelf = shelves.get(i);
                data.append("Стеллаж ").append(i + 1).append(": ")
                        .append(shelf.getShelfType() != null ? shelf.getShelfType().getName() : "Без типа")
                        .append(" (").append(shelf.getWidth()).append("x").append(shelf.getHeight()).append("px)")
                        .append(" на позиции (").append(shelf.getX()).append(",").append(shelf.getY()).append(")\n");
            }
            data.append("\n");
        }

        // Топ товаров
        List<Product> topProducts = findTopProducts(shelves, allProducts);
        if (!topProducts.isEmpty()) {
            data.append("ПОПУЛЯРНЫЕ ТОВАРЫ НА ВИТРИНЕ:\n");
            for (int i = 0; i < Math.min(topProducts.size(), 5); i++) {
                Product product = topProducts.get(i);
                data.append(i + 1).append(". ").append(product.getName())
                        .append(" (").append(product.getCategory()).append(") - $").append(product.getPrice()).append("\n");
            }
        }

        return data.toString();
    }

    private String buildAiSystemPrompt() {
        return "Ты опытный мерчандайзер и розничный аналитик с 15-летним опытом оптимизации торговых пространств. " +
                "Твоя задача - проанализировать данные планограммы и дать профессиональные рекомендации по улучшению. " +
                "Учитывай следующие аспекты:\n\n" +
                "1. ЭФФЕКТИВНОСТЬ ИСПОЛЬЗОВАНИЯ ПРОСТРАНСТВА:\n" +
                "   - Оптимальное расположение стеллажей\n" +
                "   - Использование углов и проходов\n" +
                "   - Плотность размещения товаров\n\n" +
                "2. ВЫКЛАДКА ТОВАРОВ:\n" +
                "   - Логика расположения категорий\n" +
                "   - Размещение популярных товаров\n" +
                "   - Создание товарных групп\n\n" +
                "3. ВИЗУАЛЬНАЯ ПРИВЛЕКАТЕЛЬНОСТЬ:\n" +
                "   - Баланс и симметрия\n" +
                "   - Цветовые акценты\n" +
                "   - Уровни обзора (зона уровня глаз)\n\n" +
                "4. ЛОГИСТИКА И ДОСТУПНОСТЬ:\n" +
                "   - Свободные проходы\n" +
                "   - Доступность товаров\n" +
                "   - Зоны попутных покупок\n\n" +
                "Дай 5-7 КОНКРЕТНЫХ, ПРАКТИЧЕСКИХ рекомендаций на русском языке. " +
                "Будь конкретен, предлагай измеримые действия. " +
                "Используй профессиональную терминологию мерчандайзинга.";
    }

    private String buildAiUserPrompt(String planogramData) {
        return "Проанализируй эту планограмму магазина и дай рекомендации по оптимизации:\n\n" + planogramData;
    }

    private String getAiRecommendations(String systemPrompt, String userPrompt) {
        try {
            // Временная реализация - замените на вызов вашего GroqAIService
            return groqAIService.getPlanogramRecommendations(systemPrompt, userPrompt);



        } catch (Exception e) {
            throw new RuntimeException("AI service unavailable: " + e.getMessage());
        }
    }

    private String generateEnhancedLocalInsights() {
        return "🤖 AI АНАЛИЗ ПЛАНОГРАММЫ - УМНЫЕ РЕКОМЕНДАЦИИ\n\n" +
                "🎯 КЛЮЧЕВЫЕ НАПРАВЛЕНИЯ ОПТИМИЗАЦИИ:\n\n" +
                "1. 📊 ОПТИМИЗАЦИЯ ПРОСТРАНСТВА\n" +
                "   • Используйте угловые стеллажи для увеличения выкладки на 15-20%\n" +
                "   • Создайте центральный островной стеллаж для товаров импульсного спроса\n" +
                "   • Оптимизируйте ширину проходов (рекомендуется 120-150 см)\n\n" +
                "2. 🏪 СТРАТЕГИЯ РАЗМЕЩЕНИЯ ТОВАРОВ\n" +
                "   • Разместите товары-лидеры на уровне глаз (140-170 см от пола)\n" +
                "   • Создайте товарные группы по принципу \"дополнительных покупок\"\n" +
                "   • Используйте правую сторону проходов для премиальных товаров\n\n" +
                "3. 📈 УВЕЛИЧЕНИЕ КОНВЕРСИИ\n" +
                "   • Добавьте акционные зоны у кассовой области\n" +
                "   • Создайте тематические блоки по сезонам или праздникам\n" +
                "   • Используйте ценовые акценты для привлечения внимания\n\n" +
                "4. 🎨 ВИЗУАЛЬНЫЙ МЕРЧАНДАЙЗИНГ\n" +
                "   • Примените принцип \"цветовых блоков\" для лучшей навигации\n" +
                "   • Используйте разные уровни выкладки для создания объема\n" +
                "   • Добавьте освещение для ключевых товарных групп\n\n" +
                "5. 🔄 ДИНАМИЧЕСКАЯ ОПТИМИЗАЦИЯ\n" +
                "   • Анализируйте данные о движении покупателей\n" +
                "   • Тестируйте разные схемы выкладки A/B тестами\n" +
                "   • Обновляйте планограмму раз в 2-4 недели";
    }

    private boolean isValidAiResponse(String response) {
        return response != null &&
                response.length() > 100 &&
                !response.toLowerCase().contains("error") &&
                !response.toLowerCase().contains("извините");
    }

    private String formatAiResponse(String response) {
        // Базовая форматировка ответа AI
        return "🤖 AI АНАЛИЗ ПЛАНОГРАММЫ\n\n" + response;
    }

    private List<Product> findTopProducts(List<Shelf> shelves, List<Product> allProducts) {
        // Простой алгоритм для определения популярных товаров
        // В реальной системе здесь должна быть аналитика продаж
        Map<Long, Integer> productFrequency = new HashMap<>();

        for (Shelf shelf : shelves) {
            List<ShelfCell> cells = shelfCellRepository.findByShelfIdOrderByRowIndexAscColIndexAsc(shelf.getId());
            for (ShelfCell cell : cells) {
                if (cell.getProduct() != null) {
                    Long productId = cell.getProduct().getId();
                    productFrequency.put(productId, productFrequency.getOrDefault(productId, 0) + 1);
                }
            }
        }

        return productFrequency.entrySet().stream()
                .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed())
                .limit(5)
                .map(entry -> allProducts.stream()
                        .filter(p -> p.getId().equals(entry.getKey()))
                        .findFirst()
                        .orElse(null))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    // Остальные методы остаются без изменений...
    private Map<String, Object> calculateBasicMetrics(Floorplan floorplan, List<Shelf> shelves, List<Product> allProducts) {
        Map<String, Object> metrics = new HashMap<>();

        int totalShelves = shelves.size();
        int totalProducts = allProducts.size();

        // Расчет заполненности
        int filledCells = 0;
        int totalCells = 0;
        double usedArea = 0;
        Map<String, Integer> categoryDistribution = new HashMap<>();
        Map<String, Integer> priceDistribution = new HashMap<>();

        for (Shelf shelf : shelves) {
            ShelfType shelfType = shelf.getShelfType();
            int shelfCells = (shelfType != null) ? shelfType.getRows() * shelfType.getCols() : 6;
            totalCells += shelfCells;

            // Получаем ячейки для этой полки
            List<ShelfCell> cells = shelfCellRepository.findByShelfIdOrderByRowIndexAscColIndexAsc(shelf.getId());
            int shelfFilledCells = (int) cells.stream()
                    .filter(cell -> cell.getProduct() != null)
                    .count();
            filledCells += shelfFilledCells;

            // Распределение по категориям и ценам
            for (ShelfCell cell : cells) {
                if (cell.getProduct() != null) {
                    Product product = cell.getProduct();
                    String category = product.getCategory() != null ? product.getCategory() : "Без категории";
                    categoryDistribution.put(category, categoryDistribution.getOrDefault(category, 0) + 1);

                    // Группировка по ценовым сегментам
                    String priceSegment = getPriceSegment(product.getPrice());
                    priceDistribution.put(priceSegment, priceDistribution.getOrDefault(priceSegment, 0) + 1);
                }
            }

            usedArea += (shelf.getWidth() * shelf.getHeight());
        }

        double utilization = totalCells > 0 ? (double) filledCells / totalCells * 100 : 0;
        double totalArea = floorplan.getWidth() * floorplan.getHeight();
        double areaUtilization = totalArea > 0 ? usedArea / totalArea * 100 : 0;

        metrics.put("totalShelves", totalShelves);
        metrics.put("totalProducts", totalProducts);
        metrics.put("filledCells", filledCells);
        metrics.put("totalCells", totalCells);
        metrics.put("utilization", String.format("%.1f%%", utilization).replace(",", "."));
        metrics.put("areaUtilization", String.format("%.1f%%", areaUtilization).replace(",", "."));
        metrics.put("categoryDistribution", categoryDistribution);
        metrics.put("priceDistribution", priceDistribution);
        metrics.put("usedArea", (int) usedArea);
        metrics.put("totalArea", (int) totalArea);

        return metrics;
    }

    private String getPriceSegment(BigDecimal price) {
        if (price == null) return "Не указана";
        if (price.compareTo(BigDecimal.valueOf(10)) < 0) return "Бюджетные (<10)";
        if (price.compareTo(BigDecimal.valueOf(50)) < 0) return "Средние (10-50)";
        if (price.compareTo(BigDecimal.valueOf(100)) < 0) return "Премиум (50-100)";
        return "Люкс (>100)";
    }

    private List<Map<String, Object>> generateLocalRecommendations(Map<String, Object> metrics, List<Shelf> shelves, List<Product> allProducts) {
        List<Map<String, Object>> recommendations = new ArrayList<>();

        double utilization = safeParsePercentage(metrics.get("utilization"));
        double areaUtilization = safeParsePercentage(metrics.get("areaUtilization"));
        int totalShelves = (int) metrics.get("totalShelves");
        int filledCells = (int) metrics.get("filledCells");
        int totalCells = (int) metrics.get("totalCells");

        if (utilization < 30) {
            recommendations.add(createRecommendation(
                    "warning",
                    "Критически низкая заполненность",
                    "Заполнено только " + String.format("%.1f", utilization) + "% полок. Добавьте больше товаров.",
                    "high"
            ));
        } else if (utilization < 60) {
            recommendations.add(createRecommendation(
                    "info",
                    "Средняя заполненность",
                    "Заполнено " + String.format("%.1f", utilization) + "% полок. Можно оптимизировать размещение.",
                    "medium"
            ));
        } else {
            recommendations.add(createRecommendation(
                    "success",
                    "Отличная заполненность",
                    "Заполнено " + String.format("%.1f", utilization) + "% полок. Эффективное использование пространства.",
                    "low"
            ));
        }

        if (areaUtilization < 20) {
            recommendations.add(createRecommendation(
                    "warning",
                    "Неэффективное использование площади",
                    "Используется только " + String.format("%.1f", areaUtilization) + "% доступной площади. Добавьте больше полок.",
                    "high"
            ));
        }

        Map<String, Integer> categoryDistribution = (Map<String, Integer>) metrics.get("categoryDistribution");
        if (categoryDistribution.size() < 3 && totalCells > 10) {
            recommendations.add(createRecommendation(
                    "info",
                    "Ограниченный ассортимент",
                    "Всего " + categoryDistribution.size() + " категорий товаров. Рекомендуется разнообразить ассортимент.",
                    "medium"
            ));
        }

        if (totalShelves == 0) {
            recommendations.add(createRecommendation(
                    "warning",
                    "Нет полок",
                    "Добавьте полки для размещения товаров.",
                    "high"
            ));
        } else if (totalShelves < 3) {
            recommendations.add(createRecommendation(
                    "info",
                    "Мало полок",
                    "Всего " + totalShelves + " полок. Рассмотрите возможность добавления большего количества.",
                    "medium"
            ));
        }

        return recommendations;
    }

    private double safeParsePercentage(Object percentageObj) {
        if (percentageObj == null) return 0.0;
        try {
            String percentageStr = percentageObj.toString();
            String cleanStr = percentageStr.replace("%", "").replace(",", ".");
            return Double.parseDouble(cleanStr);
        } catch (NumberFormatException e) {
            System.err.println("Error parsing percentage: " + percentageObj + ", error: " + e.getMessage());
            return 0.0;
        }
    }

    private Map<String, Object> createRecommendation(String type, String title, String description, String priority) {
        Map<String, Object> rec = new HashMap<>();
        rec.put("type", type);
        rec.put("title", title);
        rec.put("description", description);
        rec.put("priority", priority);
        return rec;
    }

    private String generateLocalAiInsights(Map<String, Object> metrics, List<Shelf> shelves) {
        double utilization = safeParsePercentage(metrics.get("utilization"));
        double areaUtilization = safeParsePercentage(metrics.get("areaUtilization"));

        StringBuilder insights = new StringBuilder();
        insights.append("🤖 БАЗОВЫЙ АНАЛИЗ ПЛАНОГРАММЫ\n\n");

        if (utilization < 40) {
            insights.append("🔴 КРИТИЧЕСКИЙ УРОВЕНЬ\n");
            insights.append("• Заполненность полок всего ").append(String.format("%.1f", utilization)).append("%\n");
            insights.append("• СРОЧНО добавьте товары на пустые полки\n");
            insights.append("• Рассмотрите увеличение ассортимента\n\n");
        } else if (utilization < 70) {
            insights.append("🟡 СРЕДНИЙ УРОВЕНЬ\n");
            insights.append("• Заполненность ").append(String.format("%.1f", utilization)).append("% - есть потенциал для роста\n");
            insights.append("• Оптимизируйте расположение товаров\n");
            insights.append("• Добавьте товары-лидеры продаж\n\n");
        } else {
            insights.append("🟢 ВЫСОКИЙ УРОВЕНЬ\n");
            insights.append("• Отличная заполненность ").append(String.format("%.1f", utilization)).append("%\n");
            insights.append("• Сфокусируйтесь на ротации товаров\n");
            insights.append("• Добавьте акционные позиции\n\n");
        }

        if (areaUtilization < 25) {
            insights.append("📏 ОПТИМИЗАЦИЯ ПРОСТРАНСТВА\n");
            insights.append("• Используется только ").append(String.format("%.1f", areaUtilization)).append("% площади\n");
            insights.append("• Добавьте дополнительные стеллажи\n");
            insights.append("• Используйте угловые размещения\n");
        }

        insights.append("\n💡 ОСНОВНЫЕ СОВЕТЫ:\n");
        insights.append("• Размещайте популярные товары на уровне глаз\n");
        insights.append("• Создайте логичные товарные группы\n");
        insights.append("• Используйте ценовые акценты\n");
        insights.append("• Обеспечьте свободные проходы\n");

        return insights.toString();
    }

    private int calculateOptimizationScore(Map<String, Object> metrics) {
        double utilization = safeParsePercentage(metrics.get("utilization"));
        double areaUtilization = safeParsePercentage(metrics.get("areaUtilization"));

        int score = 0;

        if (utilization >= 70) score += 50;
        else if (utilization >= 50) score += 35;
        else if (utilization >= 30) score += 20;
        else score += 10;

        if (areaUtilization >= 40) score += 30;
        else if (areaUtilization >= 25) score += 20;
        else if (areaUtilization >= 15) score += 10;
        else score += 5;

        Map<String, Integer> categoryDist = (Map<String, Integer>) metrics.get("categoryDistribution");
        if (categoryDist.size() >= 5) score += 20;
        else if (categoryDist.size() >= 3) score += 15;
        else if (categoryDist.size() >= 2) score += 10;
        else score += 5;

        return Math.min(score, 100);
    }

    private String generateSummary(Map<String, Object> metrics, List<Map<String, Object>> recommendations) {
        int score = calculateOptimizationScore(metrics);
        double utilization = safeParsePercentage(metrics.get("utilization"));

        if (score >= 80) {
            return "Отличная планограмма! Высокая эффективность использования пространства.";
        } else if (score >= 60) {
            return "Хорошая планограмма с потенциалом для оптимизации.";
        } else if (score >= 40) {
            return "Требуется оптимизация. Обратите внимание на рекомендации.";
        } else {
            return "Необходима значительная доработка. Следуйте рекомендациям для улучшения.";
        }
    }
}