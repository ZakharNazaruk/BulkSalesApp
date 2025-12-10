package com.example.BulkSales.util;

import com.example.BulkSales.model.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;

/**
 * Утилита для создания тестовых объектов
 */
public class TestDataBuilder {

    public static Product createProduct(String name, String category, BigDecimal price) {
        return Product.builder()
                .name(name)
                .category(category)
                .price(price)
                .quantity(100)
                .displayPriority(100)
                .active(true)
                .priority(false)
                .description("Test description for " + name)
                .discounts(new ArrayList<>())
                .groups(new ArrayList<>())
                .build();
    }

    public static Product createProduct(Long id, String name, String category, BigDecimal price, Integer quantity) {
        Product product = createProduct(name, category, price);
        product.setId(id);
        product.setQuantity(quantity);
        return product;
    }

    public static User createUser(String username, String email, String role) {
        return User.builder()
                .username(username)
                .email(email)
                .password("hashedPassword")
                .name(username + " Full Name")
                .role(role)
                .vip(false)
                .totalSpent(BigDecimal.ZERO)
                .createdAt(LocalDateTime.now())
                .orders(new ArrayList<>())
                .build();
    }

    public static User createUser(Long id, String username, String email, String role, boolean vip) {
        User user = createUser(username, email, role);
        user.setId(id);
        user.setVip(vip);
        return user;
    }

    public static Cart createCart(User user) {
        Cart cart = new Cart();
        cart.setUser(user);
        cart.setItems(new ArrayList<>());
        cart.setTotalPrice(BigDecimal.ZERO);
        return cart;
    }

    public static Cart createCart(Long id, User user) {
        Cart cart = createCart(user);
        cart.setId(id);
        return cart;
    }

    public static CartItem createCartItem(Cart cart, Product product, int quantity) {
        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(quantity);
        item.calculateSubtotal();
        return item;
    }

    public static Order createOrder(User user) {
        return Order.builder()
                .user(user)
                .items(new ArrayList<>())
                .totalPrice(BigDecimal.ZERO)
                .status(OrderStatus.PENDING_CONFIRMATION)
                .createdAt(LocalDateTime.now())
                .build();
    }

    public static Order createOrder(Long id, User user, BigDecimal totalPrice) {
        Order order = createOrder(user);
        order.setId(id);
        order.setTotalPrice(totalPrice);
        return order;
    }

    public static OrderItem createOrderItem(Order order, Product product, int quantity, BigDecimal unitPrice) {
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setUnitPrice(unitPrice);
        item.setSubtotal(unitPrice.multiply(BigDecimal.valueOf(quantity)));
        return item;
    }

    public static Discount createProductDiscount(Product product, DiscountType type, BigDecimal percent) {
        Discount discount = new Discount();
        discount.setProduct(product);
        discount.setScope(DiscountScope.PRODUCT);
        discount.setType(type);
        discount.setPercent(percent);
        discount.setName("Test Discount");
        return discount;
    }

    public static Discount createCategoryDiscount(String category, DiscountType type, BigDecimal percent) {
        Discount discount = new Discount();
        discount.setCategory(category);
        discount.setScope(DiscountScope.CATEGORY);
        discount.setType(type);
        discount.setPercent(percent);
        discount.setName("Category Discount for " + category);
        return discount;
    }

    public static Discount createGlobalDiscount(DiscountType type, BigDecimal percent) {
        Discount discount = new Discount();
        discount.setScope(DiscountScope.GLOBAL);
        discount.setType(type);
        discount.setPercent(percent);
        discount.setName("Global Discount");
        return discount;
    }

    public static Discount createBXGYDiscount(DiscountScope scope, int buyQty, int freeQty) {
        Discount discount = new Discount();
        discount.setScope(scope);
        discount.setType(DiscountType.BXGY);
        discount.setBuyQty(buyQty);
        discount.setFreeQty(freeQty);
        discount.setName("BXGY Discount");
        return discount;
    }

    public static Discount createThresholdDiscount(DiscountScope scope, int minQuantity, BigDecimal percent) {
        Discount discount = new Discount();
        discount.setScope(scope);
        discount.setType(DiscountType.THRESHOLD);
        discount.setMinQuantity(minQuantity);
        discount.setPercent(percent);
        discount.setName("Threshold Discount");
        return discount;
    }

    public static VipSettings createVipSettings(BigDecimal vipThreshold, BigDecimal vipDiscountPercent) {
        VipSettings settings = new VipSettings();
        settings.setId(1L);
        settings.setVipThreshold(vipThreshold);
        settings.setVipDiscountPercent(vipDiscountPercent);
        return settings;
    }
}
