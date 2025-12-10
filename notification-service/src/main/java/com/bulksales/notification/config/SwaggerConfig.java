package com.bulksales.notification.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI notificationServiceAPI() {
        Server localServer = new Server();
        localServer.setUrl("http://localhost:8081");
        localServer.setDescription("Notification Service - Local");

        Contact contact = new Contact();
        contact.setName("BulkSales Team");
        contact.setEmail("support@bulksales.com");

        License license = new License()
                .name("Учебный проект")
                .url("https://bulksales.com");

        Info info = new Info()
                .title("BulkSales Notification Service API")
                .version("1.0")
                .contact(contact)
                .description("Микросервис для управления уведомлениями в системе BulkSales. " +
                        "Поддерживает автоматические уведомления о заказах и товарах, " +
                        "а также массовые рассылки.")
                .termsOfService("https://bulksales.com/terms")
                .license(license);

        return new OpenAPI()
                .info(info)
                .servers(List.of(localServer));
    }
}
