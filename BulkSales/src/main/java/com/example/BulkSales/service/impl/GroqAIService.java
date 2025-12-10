package com.example.BulkSales.service.impl;

import com.example.BulkSales.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.math.BigDecimal;
import java.util.*;

@RequiredArgsConstructor
@Service
public class GroqAIService {

    private final AnalyticsService analyticsService;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${groq.api.key:free}")
    private String groqApiKey;

    // Актуальные модели Groq
    private static final String[] GROQ_MODELS = {
            "llama-3.1-8b-instant",  // Быстрая и эффективная
            "llama-3.1-70b-versatile", // Более умная
            "mixtral-8x7b-32768",    // Очень качественная
            "gemma2-9b-it"          // Альтернатива от Google
    };

    public String getRecommendations() {
        try {
            // 1. Собираем статистику
            List<Map<String, Object>> topProducts = analyticsService.getTopProducts(5);
            Map<String, Object> monthlySales = analyticsService.getMonthlySales(30);
            Map<String, BigDecimal> categorySales = analyticsService.getCategorySales(30);
            BigDecimal avgOrder = analyticsService.getAverageOrderValue();
            Map<String, Long> vipShare = analyticsService.getVipShare(30);
            Long totalOrders = analyticsService.getTotalOrders(30);
            BigDecimal totalRevenue = analyticsService.getTotalRevenue(30);

            // 2. Формируем структурированные данные
            String stats = buildStructuredStats(topProducts, monthlySales, categorySales, avgOrder, vipShare, totalOrders, totalRevenue);

            // 3. Пытаемся получить рекомендации от Groq
            if (!groqApiKey.equals("free") && !groqApiKey.isEmpty()) {
                try {
                    String aiRecommendations = getGroqRecommendations(stats);
                    if (isValidAIResponse(aiRecommendations)) {
                        return aiRecommendations;
                    }
                } catch (Exception e) {
                    System.err.println("Groq API failed: " + e.getMessage());
                    // Пробуем другую модель при ошибке
                    try {
                        String fallbackRecommendations = getGroqRecommendationsWithFallback(stats);
                        if (isValidAIResponse(fallbackRecommendations)) {
                            return fallbackRecommendations;
                        }
                    } catch (Exception ex) {
                        System.err.println("Groq fallback also failed: " + ex.getMessage());
                    }
                }
            }

            // 4. Fallback
            return generateLocalRecommendations(topProducts, monthlySales, categorySales, avgOrder, vipShare, totalOrders, totalRevenue);

        } catch (Exception e) {
            System.err.println("Error in getRecommendations: " + e.getMessage());
            return generateFallbackRecommendations();
        }
    }

    private String getGroqRecommendations(String stats) {
        return getGroqRecommendationsWithModel(stats, GROQ_MODELS[0]); // Начинаем с первой модели
    }

    private String getGroqRecommendationsWithFallback(String stats) {
        // Пробуем другие модели если первая не сработала
        for (int i = 1; i < GROQ_MODELS.length; i++) {
            try {
                System.out.println("Trying model: " + GROQ_MODELS[i]);
                String result = getGroqRecommendationsWithModel(stats, GROQ_MODELS[i]);
                if (isValidAIResponse(result)) {
                    return result;
                }
            } catch (Exception e) {
                System.err.println("Model " + GROQ_MODELS[i] + " failed: " + e.getMessage());
            }
        }
        throw new RuntimeException("All Groq models failed");
    }

    private String getGroqRecommendationsWithModel(String stats, String model) {
        String apiUrl = "https://api.groq.com/openai/v1/chat/completions";

        String systemPrompt = "Ты опытный e-commerce аналитик с 10-летним опытом. " +
                "Проанализируй данные о продажах и дай 5-7 КОНКРЕТНЫХ, ПРАКТИЧЕСКИХ рекомендаций на русском языке. " +
                "Учитывай:\n" +
                "1. Динамику продаж и тренды\n" +
                "2. Эффективность товарного ассортимента\n" +
                "3. Потенциал роста бизнеса\n" +
                "4. Маркетинговые возможности\n" +
                "5. Улучшение клиентского опыта\n\n" +
                "Будь конкретен, предлагай измеримые действия и давай практические советы.";

        String userPrompt = "Проанализируй эти данные о продажах интернет-магазина и дай умные рекомендации:\n\n" + stats;

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));
        requestBody.put("max_tokens", 2000);
        requestBody.put("temperature", 0.7);
        requestBody.put("top_p", 0.9);
        requestBody.put("stream", false);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + groqApiKey);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");
                    System.out.println("Groq AI Response (" + model + "): " + content.substring(0, Math.min(100, content.length())) + "...");
                    return content;
                }
            }

            throw new RuntimeException("Invalid response from Groq API");

        } catch (Exception e) {
            throw new RuntimeException("Groq API call failed for model " + model + ": " + e.getMessage());
        }
    }

    private String buildStructuredStats(List<Map<String, Object>> topProducts,
                                        Map<String, Object> monthlySales,
                                        Map<String, BigDecimal> categorySales,
                                        BigDecimal avgOrder,
                                        Map<String, Long> vipShare,
                                        Long totalOrders,
                                        BigDecimal totalRevenue) {

        StringBuilder stats = new StringBuilder();

        stats.append("📊 ДАННЫЕ ДЛЯ АНАЛИЗА E-COMMERCE\n");
        stats.append("Период: последние 30 дней\n\n");

        // Ключевые метрики
        stats.append("ОСНОВНЫЕ МЕТРИКИ:\n");
        stats.append("• Общая выручка: ").append(totalRevenue).append(" руб.\n");
        stats.append("• Количество заказов: ").append(totalOrders).append("\n");
        stats.append("• Средний чек: ").append(avgOrder).append(" руб.\n");

        // Анализ эффективности
        if (totalOrders > 0) {
            BigDecimal revenuePerOrder = totalRevenue.divide(BigDecimal.valueOf(totalOrders), 2, BigDecimal.ROUND_HALF_UP);
            stats.append("• Выручка на заказ: ").append(revenuePerOrder).append(" руб.\n");
        }
        stats.append("\n");

        // Топ товары
        if (!topProducts.isEmpty()) {
            stats.append("ТОП-5 ТОВАРОВ ПО ВЫРУЧКЕ:\n");
            BigDecimal totalTopRevenue = BigDecimal.ZERO;

            for (int i = 0; i < Math.min(topProducts.size(), 5); i++) {
                Map<String, Object> product = topProducts.get(i);
                String name = (String) product.getOrDefault("productName", "Товар " + (i + 1));
                BigDecimal revenue = (BigDecimal) product.getOrDefault("revenue", BigDecimal.ZERO);
                totalTopRevenue = totalTopRevenue.add(revenue);

                stats.append(i + 1).append(". ").append(name)
                        .append(" - ").append(revenue).append(" руб.\n");
            }

            // Доля топовых товаров
            if (totalRevenue.compareTo(BigDecimal.ZERO) > 0) {
                double topProductsShare = totalTopRevenue.doubleValue() / totalRevenue.doubleValue() * 100;
                stats.append("• Доля топ-5 в общей выручке: ").append(String.format("%.1f", topProductsShare)).append("%\n");
            }
            stats.append("\n");
        }

        // Клиентская база
        if (vipShare != null) {
            Long vip = vipShare.getOrDefault("VIP", 0L);
            Long nonVip = vipShare.getOrDefault("NON_VIP", 0L);
            long totalUsers = vip + nonVip;

            if (totalUsers > 0) {
                double vipPercentage = (double) vip / totalUsers * 100;
                stats.append("КЛИЕНТСКАЯ БАЗА:\n");
                stats.append("• VIP клиенты: ").append(vip).append(" (").append(String.format("%.1f", vipPercentage)).append("%)\n");
                stats.append("• Обычные клиенты: ").append(nonVip).append(" (").append(String.format("%.1f", 100 - vipPercentage)).append("%)\n");
                stats.append("• Всего клиентов: ").append(totalUsers).append("\n\n");
            }
        }

        // Категории
        if (!categorySales.isEmpty()) {
            stats.append("ПРОДАЖИ ПО КАТЕГОРИЯМ (ТОП-3):\n");
            categorySales.entrySet().stream()
                    .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                    .limit(3)
                    .forEach(entry -> {
                        String category = entry.getKey().isEmpty() ? "Без категории" : entry.getKey();
                        stats.append("• ").append(category)
                                .append(": ").append(entry.getValue()).append(" руб.\n");
                    });
        }

        return stats.toString();
    }

    private boolean isValidAIResponse(String response) {
        return response != null &&
                !response.isEmpty() &&
                response.length() > 150 && // Минимум 150 символов для осмысленного ответа
                !response.toLowerCase().contains("error") &&
                !response.toLowerCase().contains("sorry");
    }

    private String generateLocalRecommendations(List<Map<String, Object>> topProducts,
                                                Map<String, Object> monthlySales,
                                                Map<String, BigDecimal> categorySales,
                                                BigDecimal avgOrder,
                                                Map<String, Long> vipShare,
                                                Long totalOrders,
                                                BigDecimal totalRevenue) {
        return "🤖 АНАЛИТИЧЕСКИЕ РЕКОМЕНДАЦИИ\n\n" +
                "На основе анализа ваших данных за 30 дней:\n" +
                "• Выручка: " + totalRevenue + " руб.\n" +
                "• Заказы: " + totalOrders + " шт.\n" +
                "• Средний чек: " + avgOrder + " руб.\n\n" +
                "Ключевые рекомендации:\n" +
                "1. Увеличьте маркетинговый бюджет для топовых товаров\n" +
                "2. Оптимизируйте ассортимент на основе данных о продажах\n" +
                "3. Разработайте программу лояльности для VIP клиентов\n" +
                "4. Тестируйте новые ценовые стратегии\n" +
                "5. Улучшите клиентский опыт и сервис";
    }

    private String generateFallbackRecommendations() {
        return "🚀 УНИВЕРСАЛЬНЫЕ РЕКОМЕНДАЦИИ ДЛЯ РОСТА ПРОДАЖ\n\n" +
                "1. 📊 ГЛУБОКИЙ АНАЛИЗ ДАННЫХ\n" +
                "   • Ежедневно отслеживайте ключевые метрики\n" +
                "   • Выявляйте сезонные тренды и закономерности\n" +
                "   • Анализируйте поведение клиентов на сайте\n\n" +
                "2. 🎯 ОПТИМИЗАЦИЯ АССОРТИМЕНТА\n" +
                "   • Увеличьте запас популярных товаров\n" +
                "   • Сократите медленно продающиеся позиции\n" +
                "   • Регулярно тестируйте новинки\n\n" +
                "3. 💰 ЭФФЕКТИВНОЕ ЦЕНООБРАЗОВАНИЕ\n" +
                "   • Изучайте ценовую политику конкурентов\n" +
                "   • Тестируйте разные ценовые сегменты\n" +
                "   • Внедряйте акции и специальные предложения\n\n" +
                "4. 👑 РАЗВИТИЕ ЛОЯЛЬНОСТИ\n" +
                "   • Создайте многоуровневую программу лояльности\n" +
                "   • Персонализируйте коммуникации с клиентами\n" +
                "   • Улучшайте качество клиентского сервиса";
    }
    public String getPlanogramRecommendations(String systemPrompt, String userPrompt) {
        // Актуальные модели Groq
        String[] availableModels = {
                "llama-3.1-8b-instant",    // Быстрая и эффективная
                "mixtral-8x7b-32768",      // Высокое качество
                "gemma2-9b-it",           // От Google
                "llama3-8b-8192"          // Стабильная версия
        };

        // Пробуем все модели по очереди
        for (String model : availableModels) {
            try {
                System.out.println("Trying model: " + model);
                String result = getPlanogramRecommendationsWithModel(systemPrompt, userPrompt, model);
                if (isValidAiResponse(result)) {
                    return result;
                }
            } catch (Exception e) {
                System.err.println("Model " + model + " failed: " + e.getMessage());
                // Продолжаем пробовать следующую модель
            }
        }

        throw new RuntimeException("All Groq models failed");
    }

    private String getPlanogramRecommendationsWithModel(String systemPrompt, String userPrompt, String model) {
        try {
            String apiUrl = "https://api.groq.com/openai/v1/chat/completions";

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", userPrompt)
            ));
            requestBody.put("max_tokens", 2000);
            requestBody.put("temperature", 0.7);
            requestBody.put("top_p", 0.9);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + groqApiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map> response = restTemplate.exchange(
                    apiUrl,
                    HttpMethod.POST,
                    entity,
                    Map.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> responseBody = response.getBody();
                List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    String content = (String) message.get("content");
                    System.out.println("Groq AI Response (" + model + "): " + content.substring(0, Math.min(100, content.length())) + "...");
                    return content;
                }
            }

            throw new RuntimeException("Invalid response from Groq API for model " + model);

        } catch (Exception e) {
            throw new RuntimeException("Groq API call failed for model " + model + ": " + e.getMessage());
        }
    }

    private boolean isValidAiResponse(String response) {
        return response != null &&
                response.length() > 150 &&
                !response.toLowerCase().contains("error") &&
                !response.toLowerCase().contains("sorry") &&
                !response.toLowerCase().contains("decommissioned");
    }}