package com.example.BulkSales.config;

import com.example.BulkSales.feign.NotificationServiceClient;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import static org.mockito.Mockito.mock;

/**
 * Конфигурация для тестов, мокирует внешние зависимости
 */
@TestConfiguration
public class TestConfig {

    /**
     * Мок NotificationServiceClient для предотвращения реальных вызовов внешнего сервиса
     */
    @Bean
    @Primary
    public NotificationServiceClient notificationServiceClient() {
        return mock(NotificationServiceClient.class);
    }
}
