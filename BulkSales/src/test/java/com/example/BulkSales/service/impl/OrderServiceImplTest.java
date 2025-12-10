package com.example.BulkSales.service.impl;

import com.example.BulkSales.dto.event.OrderStatusChangedEvent;
import com.example.BulkSales.exceptions.InvalidOperationException;
import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.feign.NotificationServiceClient;
import com.example.BulkSales.model.*;
import com.example.BulkSales.repository.*;
import com.example.BulkSales.util.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Юнит-тесты для OrderServiceImpl
 * Включает тесты для сложной логики скидок и создания заказов
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("OrderServiceImpl Unit Tests")
class OrderServiceImplTest {

    @Mock
    private ProductRepository productRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private CartRepository cartRepository;
    
    @Mock
    private OrderRepository orderRepository;
    
    @Mock
    private OrderItemRepository orderItemRepository;
    
    @Mock
    private VipSettingsRepository vipSettingsRepository;
    
    @Mock
    private DiscountRepository discountRepository;
    
    @Mock
    private NotificationServiceClient notificationServiceClient;

    @InjectMocks
    private OrderServiceImpl orderService;

    private User testUser;
    private Cart testCart;
    private Product testProduct1;
    private Product testProduct2;

    @BeforeEach
    void setUp() {
        testUser = TestDataBuilder.createUser(1L, "testuser", "test@example.com", "CLIENT", false);
        testCart = TestDataBuilder.createCart(1L, testUser);
        testUser.setCart(testCart);
        
        testProduct1 = TestDataBuilder.createProduct(1L, "Product 1", "Electronics", 
                new BigDecimal("100.00"), 100);
        testProduct2 = TestDataBuilder.createProduct(2L, "Product 2", "Electronics", 
                new BigDecimal("50.00"), 100);
    }

    // ==================== Basic Checkout Tests ====================

    @Test
    @DisplayName("checkout - должен выбросить исключение при пустой корзине")
    void checkout_ShouldThrowException_WhenCartIsEmpty() {
        // Given
        testCart.setItems(new ArrayList<>());
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));

        // When & Then
        assertThatThrownBy(() -> orderService.checkout(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cart is empty");
        
        verify(orderRepository, never()).save(any());
    }

    @Test
    @DisplayName("checkout - должен выбросить исключение при недостаточном остатке")
    void checkout_ShouldThrowException_WhenInsufficientStock() {
        // Given
        testProduct1.setQuantity(5); // Недостаточно
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 10);
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());

        // When & Then
        assertThatThrownBy(() -> orderService.checkout(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Not enough stock");
    }

    @Test
    @DisplayName("checkout - базовый сценарий без скидок")
    void checkout_ShouldCreateOrder_WithoutDiscounts() {
        // Given
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 2);
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = orderService.checkout(1L);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getUser()).isEqualTo(testUser);
        assertThat(result.getTotalPrice()).isEqualByComparingTo(new BigDecimal("200.00")); // 100 * 2
        assertThat(testProduct1.getQuantity()).isEqualTo(98); // 100 - 2
        assertThat(testCart.getItems()).isEmpty(); // Корзина очищена
        assertThat(testCart.getTotalPrice()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    // ==================== VIP Discount Tests ====================

    @Test
    @DisplayName("checkout - должен применить VIP скидку")
    void checkout_ShouldApplyVipDiscount() {
        // Given
        testUser.setVip(true);
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 1);
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        VipSettings vipSettings = TestDataBuilder.createVipSettings(
                new BigDecimal("1000.00"), 
                new BigDecimal("10.00") // 10% VIP скидка
        );
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.of(vipSettings));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = orderService.checkout(1L);

        // Then
        assertThat(result).isNotNull();
        // Цена должна быть 100 - 10% = 90
        assertThat(result.getTotalPrice()).isEqualByComparingTo(new BigDecimal("90.00"));
    }

    // ==================== PERCENT Discount Tests ====================

    @Test
    @DisplayName("checkout - должен применить процентную скидку на продукт")
    void checkout_ShouldApplyPercentDiscount_OnProduct() {
        // Given
        Discount productDiscount = TestDataBuilder.createProductDiscount(
                testProduct1, DiscountType.PERCENT, new BigDecimal("20.00")
        );
        testProduct1.getDiscounts().add(productDiscount);
        
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 1);
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = orderService.checkout(1L);

        // Then
        assertThat(result).isNotNull();
        // Цена должна быть 100 - 20% = 80
        assertThat(result.getTotalPrice()).isEqualByComparingTo(new BigDecimal("80.00"));
    }

    @Test
    @DisplayName("checkout - должен применить категорийную процентную скидку")
    void checkout_ShouldApplyCategoryPercentDiscount() {
        // Given
        Discount categoryDiscount = TestDataBuilder.createCategoryDiscount(
                "Electronics", DiscountType.PERCENT, new BigDecimal("15.00")
        );
        
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 2);
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of(categoryDiscount));
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = orderService.checkout(1L);

        // Then
        assertThat(result).isNotNull();
        // Цена должна быть (100 - 15%) * 2 = 85 * 2 = 170
        assertThat(result.getTotalPrice()).isEqualByComparingTo(new BigDecimal("170.00"));
    }

    // ==================== THRESHOLD Discount Tests ====================

    @Test
    @DisplayName("checkout - должен применить пороговую скидку при достижении минимума")
    void checkout_ShouldApplyThresholdDiscount_WhenThresholdMet() {
        // Given
        Discount thresholdDiscount = TestDataBuilder.createThresholdDiscount(
                DiscountScope.PRODUCT, 3, new BigDecimal("25.00")
        );
        thresholdDiscount.setProduct(testProduct1);
        testProduct1.getDiscounts().add(thresholdDiscount);
        
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 5); // Больше порога
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = orderService.checkout(1L);

        // Then
        assertThat(result).isNotNull();
        // Цена должна быть (100 - 25%) * 5 = 75 * 5 = 375
        assertThat(result.getTotalPrice()).isEqualByComparingTo(new BigDecimal("375.00"));
    }

    @Test
    @DisplayName("checkout - не должен применить пороговую скидку без достижения минимума")
    void checkout_ShouldNotApplyThresholdDiscount_WhenThresholdNotMet() {
        // Given
        Discount thresholdDiscount = TestDataBuilder.createThresholdDiscount(
                DiscountScope.PRODUCT, 5, new BigDecimal("25.00")
        );
        thresholdDiscount.setProduct(testProduct1);
        testProduct1.getDiscounts().add(thresholdDiscount);
        
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 3); // Меньше порога
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = orderService.checkout(1L);

        // Then
        assertThat(result).isNotNull();
        // Скидка не применяется, цена = 100 * 3 = 300
        assertThat(result.getTotalPrice()).isEqualByComparingTo(new BigDecimal("300.00"));
    }

    // ==================== BXGY Discount Tests ====================

    @Test
    @DisplayName("checkout - должен применить BXGY скидку на уровне продукта")
    void checkout_ShouldApplyBXGYDiscount_OnProduct() {
        // Given - Купи 2, получи 1 бесплатно
        Discount bxgyDiscount = TestDataBuilder.createBXGYDiscount(DiscountScope.PRODUCT, 2, 1);
        bxgyDiscount.setProduct(testProduct1);
        testProduct1.getDiscounts().add(bxgyDiscount);
        
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 6); // 2 комплекта (2+1)*2
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = orderService.checkout(1L);

        // Then
        assertThat(result).isNotNull();
        // Полная цена за 6 товаров = 600, минус 2 бесплатных (2 комплекта) = 600 - 200 = 400
        assertThat(result.getTotalPrice()).isEqualByComparingTo(new BigDecimal("400.00"));
    }

    // ==================== VIP Status Update Tests ====================

    @Test
    @DisplayName("checkout - должен обновить VIP статус при достижении порога")
    void checkout_ShouldUpdateVipStatus_WhenThresholdReached() {
        // Given
        testUser.setTotalSpent(new BigDecimal("900.00")); // Близко к порогу
        testUser.setVip(false);
        
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 2); // +200
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        VipSettings vipSettings = TestDataBuilder.createVipSettings(
                new BigDecimal("1000.00"), // Порог
                new BigDecimal("10.00")
        );
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.of(vipSettings));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        orderService.checkout(1L);

        // Then
        assertThat(testUser.isVip()).isTrue();
        assertThat(testUser.getTotalSpent()).isGreaterThanOrEqualTo(new BigDecimal("1000.00"));
    }

    // ==================== Order Status Tests ====================

    @Test
    @DisplayName("updateStatus - должен обновить статус и отправить уведомление")
    void updateStatus_ShouldUpdateStatusAndSendNotification() {
        // Given
        Order order = TestDataBuilder.createOrder(1L, testUser, new BigDecimal("100.00"));
        order.setStatus(OrderStatus.PENDING_CONFIRMATION);
        
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Order result = orderService.updateStatus(1L, "SHIPPED");

        // Then
        assertThat(result.getStatus()).isEqualTo(OrderStatus.SHIPPED);
        
        ArgumentCaptor<OrderStatusChangedEvent> eventCaptor = ArgumentCaptor.forClass(OrderStatusChangedEvent.class);
        verify(notificationServiceClient).notifyOrderStatusChanged(eventCaptor.capture());
        
        OrderStatusChangedEvent capturedEvent = eventCaptor.getValue();
        assertThat(capturedEvent.getOrderId()).isEqualTo(1L);
        assertThat(capturedEvent.getOldStatus()).isEqualTo("PENDING_CONFIRMATION");
        assertThat(capturedEvent.getNewStatus()).isEqualTo("SHIPPED");
    }

    @Test
    @DisplayName("updateStatus - должен выбросить исключение для невалидного статуса")
    void updateStatus_ShouldThrowException_ForInvalidStatus() {
        // Given
        Order order = TestDataBuilder.createOrder(1L, testUser, new BigDecimal("100.00"));
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        // When & Then
        assertThatThrownBy(() -> orderService.updateStatus(1L, "INVALID_STATUS"))
                .isInstanceOf(InvalidOperationException.class)
                .hasMessageContaining("Invalid status value");
        
        verify(orderRepository, never()).save(any());
        verifyNoInteractions(notificationServiceClient);
    }

    @Test
    @DisplayName("updateStatus - должен выбросить исключение для несуществующего заказа")
    void updateStatus_ShouldThrowException_ForNonexistentOrder() {
        // Given
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> orderService.updateStatus(999L, "SHIPPED"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Order not found");
    }

    // ==================== Get Methods Tests ====================

    @Test
    @DisplayName("getById - должен вернуть заказ по ID")
    void getById_ShouldReturnOrder() {
        // Given
        Order order = TestDataBuilder.createOrder(1L, testUser, new BigDecimal("100.00"));
        when(orderRepository.findById(1L)).thenReturn(Optional.of(order));

        // When
        Order result = orderService.getById(1L);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getById - должен выбросить исключение для несуществующего заказа")
    void getById_ShouldThrowException_WhenOrderNotFound() {
        // Given
        when(orderRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> orderService.getById(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Order not found");
    }

    @Test
    @DisplayName("getByUser - должен вернуть список заказов пользователя")
    void getByUser_ShouldReturnUserOrders() {
        // Given
        Order order1 = TestDataBuilder.createOrder(1L, testUser, new BigDecimal("100.00"));
        Order order2 = TestDataBuilder.createOrder(2L, testUser, new BigDecimal("200.00"));
        
        when(orderRepository.findByUserId(1L)).thenReturn(Arrays.asList(order1, order2));

        // When
        List<Order> result = orderService.getByUser(1L);

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).containsExactly(order1, order2);
    }

    @Test
    @DisplayName("getAll - должен вернуть все заказы")
    void getAll_ShouldReturnAllOrders() {
        // Given
        User user2 = TestDataBuilder.createUser(2L, "user2", "user2@example.com", "CLIENT", false);
        Order order1 = TestDataBuilder.createOrder(1L, testUser, new BigDecimal("100.00"));
        Order order2 = TestDataBuilder.createOrder(2L, user2, new BigDecimal("200.00"));
        
        when(orderRepository.findAll()).thenReturn(Arrays.asList(order1, order2));

        // When
        List<Order> result = orderService.getAll();

        // Then
        assertThat(result).hasSize(2);
        assertThat(result).containsExactly(order1, order2);
    }

    // ==================== Stock Management Tests ====================

    @Test
    @DisplayName("checkout - должен корректно списать остатки со склада")
    void checkout_ShouldCorrectlyDeductStockQuantities() {
        // Given
        testProduct1.setQuantity(100);
        testProduct2.setQuantity(50);
        
        CartItem item1 = TestDataBuilder.createCartItem(testCart, testProduct1, 10);
        CartItem item2 = TestDataBuilder.createCartItem(testCart, testProduct2, 5);
        testCart.setItems(new ArrayList<>(Arrays.asList(item1, item2)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        orderService.checkout(1L);

        // Then
        assertThat(testProduct1.getQuantity()).isEqualTo(90); // 100 - 10
        assertThat(testProduct2.getQuantity()).isEqualTo(45); // 50 - 5
    }

    // ==================== Cart Clearing Tests ====================

    @Test
    @DisplayName("checkout - должен очистить корзину после оформления заказа")
    void checkout_ShouldClearCartAfterCheckout() {
        // Given
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct1, 2);
        testCart.setItems(new ArrayList<>(List.of(item)));
        testCart.setTotalPrice(new BigDecimal("200.00"));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.findByUserId(1L)).thenReturn(Optional.of(testCart));
        when(discountRepository.findAll()).thenReturn(List.of());
        when(vipSettingsRepository.findById(1L)).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> {
            Order order = invocation.getArgument(0);
            order.setId(1L);
            return order;
        });
        when(orderItemRepository.save(any(OrderItem.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        orderService.checkout(1L);

        // Then
        assertThat(testCart.getItems()).isEmpty();
        assertThat(testCart.getTotalPrice()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}
