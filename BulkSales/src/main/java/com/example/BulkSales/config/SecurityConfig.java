package com.example.BulkSales.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .authorizeHttpRequests(authorizeHttpRequests -> authorizeHttpRequests
                        // Public endpoints
                        .requestMatchers("/public/**", "/auth/**").permitAll()
                        .requestMatchers("/", "/error", "/csrf", "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs", "/v3/api-docs/**", "/uploads/**").permitAll()

                        // Public read-only endpoints
                        .requestMatchers(HttpMethod.GET, "/api/products/active","api/vip/config","/api/product-groups/active","/api/discounts").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/categories", "/api/categories/**").permitAll()

                        // Read-only product/planogram access for all authenticated roles
                        .requestMatchers(HttpMethod.GET, "/api/banners/all").hasAnyAuthority(MANAGER, ADMIN, "ROLE_MANAGER", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/banners", "/api/banners/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/banners/**").hasAnyAuthority(MANAGER, ADMIN, "ROLE_MANAGER", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/banners/**").hasAnyAuthority(MANAGER, ADMIN, "ROLE_MANAGER", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/banners/**").hasAnyAuthority(MANAGER, ADMIN, "ROLE_MANAGER", "ROLE_ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/planograms/**", "/api/discounts/**", "/api/categories/**", "/api/notifications/**").hasAnyAuthority(ADMIN, USER, MANAGER, CLIENT)
                        .requestMatchers(HttpMethod.GET, "/api/floorplans/**").hasAnyAuthority(ADMIN, MANAGER)
                        .requestMatchers(HttpMethod.POST, "/api/floorplans/**").hasAnyAuthority(MANAGER)
                        .requestMatchers(HttpMethod.POST, "/api/notifications/**").hasAnyAuthority(ADMIN, USER, MANAGER, CLIENT)

                        // Orders admin listing
                        .requestMatchers(HttpMethod.GET, "/api/orders/all").hasAnyAuthority(ADMIN, MANAGER)
                        // Cart and orders: clients and managers can operate
.requestMatchers("/api/cart/**", "/api/orders/**").hasAnyAuthority(USER, MANAGER, CLIENT)

                        // Manager manages products/planograms/categories/discounts
                        .requestMatchers(HttpMethod.POST, "/api/products/**", "/api/planograms/**", "/api/discounts/**", "/api/categories/**", "/api/related/**").hasAnyAuthority(MANAGER)
                        .requestMatchers(HttpMethod.POST, "/api/orders/*/status").hasAnyAuthority(MANAGER)
                        .requestMatchers(HttpMethod.PUT, "/api/products/**", "/api/planograms/**", "/api/discounts/**", "/api/categories/**").hasAnyAuthority(MANAGER)
                        .requestMatchers(HttpMethod.DELETE, "/api/products/**", "/api/planograms/**", "/api/discounts/**", "/api/categories/**").hasAnyAuthority(MANAGER)

                        // Analytics only for admin/manager
                        .requestMatchers("/api/analytics/**").hasAnyAuthority(ADMIN, MANAGER)

                        // VIP settings: GET for authenticated, PUT only for manager/admin
                        .requestMatchers(HttpMethod.GET, "/api/vip/**").hasAnyAuthority(ADMIN, MANAGER, USER)
                        .requestMatchers(HttpMethod.PUT, "/api/vip/**").hasAnyAuthority(ADMIN, MANAGER)

                        // Admin manages users
                        .requestMatchers("/api/users/me").hasAnyAuthority(ADMIN, USER, MANAGER, CLIENT)
                        .requestMatchers("/api/users/**").permitAll()
                        .requestMatchers("api/product-groups/active").hasAnyAuthority(ADMIN, USER, MANAGER, CLIENT)

                        .anyRequest().authenticated())
                .httpBasic(Customizer.withDefaults())
                .sessionManagement(sessionManagement -> sessionManagement.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    public static final String ADMIN = "ADMIN";
    public static final String USER = "USER";
    public static final String MANAGER = "MANAGER";
    public static final String CLIENT = "CLIENT";
}
