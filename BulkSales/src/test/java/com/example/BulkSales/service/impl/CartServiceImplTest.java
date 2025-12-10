package com.example.BulkSales.service.impl;

import com.example.BulkSales.exceptions.ResourceNotFoundException;
import com.example.BulkSales.model.Cart;
import com.example.BulkSales.model.CartItem;
import com.example.BulkSales.model.Product;
import com.example.BulkSales.model.User;
import com.example.BulkSales.repository.CartRepository;
import com.example.BulkSales.repository.ProductRepository;
import com.example.BulkSales.repository.UserRepository;
import com.example.BulkSales.util.TestDataBuilder;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Юнит-тесты для CartServiceImpl
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CartServiceImpl Unit Tests")
class CartServiceImplTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private CartServiceImpl cartService;

    private User testUser;
    private Product testProduct;
    private Cart testCart;

    @BeforeEach
    void setUp() {
        testUser = TestDataBuilder.createUser(1L, "testuser", "test@example.com", "CLIENT", false);
        testProduct = TestDataBuilder.createProduct(1L, "Test Product", "Electronics", 
                new BigDecimal("100.00"), 50);
        testCart = TestDataBuilder.createCart(1L, testUser);
        testUser.setCart(testCart);
    }

    // ==================== getCartByUserId Tests ====================

    @Test
    @DisplayName("getCartByUserId - должен вернуть существующую корзину")
    void getCartByUserId_ShouldReturnExistingCart() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // When
        Cart result = cartService.getCartByUserId(1L);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getUser()).isEqualTo(testUser);
        verify(userRepository).findById(1L);
        verifyNoInteractions(cartRepository); // Не должно быть взаимодействия с репозиторием корзины
    }

    @Test
    @DisplayName("getCartByUserId - должен создать новую корзину если её нет")
    void getCartByUserId_ShouldCreateNewCart_WhenCartDoesNotExist() {
        // Given
        testUser.setCart(null); // У пользователя нет корзины
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> {
            Cart cart = invocation.getArgument(0);
            cart.setId(1L);
            return cart;
        });

        // When
        Cart result = cartService.getCartByUserId(1L);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getUser()).isEqualTo(testUser);
        assertThat(result.getItems()).isEmpty();
        assertThat(result.getTotalPrice()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(userRepository).findById(1L);
        verify(cartRepository).save(any(Cart.class));
    }

    @Test
    @DisplayName("getCartByUserId - должен выбросить исключение для несуществующего пользователя")
    void getCartByUserId_ShouldThrowException_WhenUserNotFound() {
        // Given
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> cartService.getCartByUserId(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User not found");
        
        verify(userRepository).findById(999L);
        verifyNoInteractions(cartRepository);
    }

    // ==================== addProduct Tests ====================

    @Test
    @DisplayName("addProduct - должен добавить новый товар в корзину")
    void addProduct_ShouldAddNewProductToCart() {
        // Given
        testCart.setItems(new ArrayList<>());
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Cart result = cartService.addProduct(1L, 1L, 2);

        // Then
        assertThat(result.getItems()).hasSize(1);
        CartItem addedItem = result.getItems().get(0);
        assertThat(addedItem.getProduct()).isEqualTo(testProduct);
        assertThat(addedItem.getQuantity()).isEqualTo(2);
        assertThat(addedItem.getCart()).isEqualTo(testCart);
        verify(cartRepository).save(testCart);
    }

    @Test
    @DisplayName("addProduct - должен увеличить количество существующего товара")
    void addProduct_ShouldIncreaseQuantity_WhenProductAlreadyInCart() {
        // Given
        CartItem existingItem = TestDataBuilder.createCartItem(testCart, testProduct, 2);
        testCart.setItems(new ArrayList<>(List.of(existingItem)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Cart result = cartService.addProduct(1L, 1L, 3);

        // Then
        assertThat(result.getItems()).hasSize(1);
        CartItem updatedItem = result.getItems().get(0);
        assertThat(updatedItem.getQuantity()).isEqualTo(5); // 2 + 3
        verify(cartRepository).save(testCart);
    }

    @Test
    @DisplayName("addProduct - должен выбросить исключение для несуществующего товара")
    void addProduct_ShouldThrowException_WhenProductNotFound() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> cartService.addProduct(1L, 999L, 1))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Product not found");
        
        verify(productRepository).findById(999L);
        verify(cartRepository, never()).save(any());
    }

    @Test
    @DisplayName("addProduct - должен пересчитать totalPrice корзины")
    void addProduct_ShouldRecalculateTotalPrice() {
        // Given
        testCart.setItems(new ArrayList<>());
        testProduct.setPrice(new BigDecimal("100.00"));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Cart result = cartService.addProduct(1L, 1L, 3);

        // Then
        // totalPrice должен быть 100 * 3 = 300
        assertThat(result.getTotalPrice()).isGreaterThan(BigDecimal.ZERO);
        verify(cartRepository).save(testCart);
    }

    @Test
    @DisplayName("addProduct - должен добавить несколько разных товаров")
    void addProduct_ShouldAddMultipleDifferentProducts() {
        // Given
        Product product2 = TestDataBuilder.createProduct(2L, "Product 2", "Books", 
                new BigDecimal("50.00"), 30);
        
        testCart.setItems(new ArrayList<>());
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(productRepository.findById(2L)).thenReturn(Optional.of(product2));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        cartService.addProduct(1L, 1L, 2);
        Cart result = cartService.addProduct(1L, 2L, 1);

        // Then
        assertThat(result.getItems()).hasSize(2);
        verify(cartRepository, times(2)).save(testCart);
    }

    // ==================== removeProduct Tests ====================

    @Test
    @DisplayName("removeProduct - должен удалить товар из корзины")
    void removeProduct_ShouldRemoveProductFromCart() {
        // Given
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct, 2);
        testCart.setItems(new ArrayList<>(List.of(item)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Cart result = cartService.removeProduct(1L, 1L);

        // Then
        assertThat(result.getItems()).isEmpty();
        verify(cartRepository).save(testCart);
    }

    @Test
    @DisplayName("removeProduct - должен пересчитать totalPrice после удаления")
    void removeProduct_ShouldRecalculateTotalPrice_AfterRemoval() {
        // Given
        Product product2 = TestDataBuilder.createProduct(2L, "Product 2", "Books", 
                new BigDecimal("50.00"), 30);
        
        CartItem item1 = TestDataBuilder.createCartItem(testCart, testProduct, 2);
        CartItem item2 = TestDataBuilder.createCartItem(testCart, product2, 1);
        testCart.setItems(new ArrayList<>(List.of(item1, item2)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Cart result = cartService.removeProduct(1L, 1L);

        // Then
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getProduct()).isEqualTo(product2);
        verify(cartRepository).save(testCart);
    }

    @Test
    @DisplayName("removeProduct - не должен выбросить исключение при удалении несуществующего товара")
    void removeProduct_ShouldNotThrowException_WhenProductNotInCart() {
        // Given
        testCart.setItems(new ArrayList<>());
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When & Then - не должно выбросить исключение
        assertThatCode(() -> cartService.removeProduct(1L, 999L))
                .doesNotThrowAnyException();
        
        verify(cartRepository).save(testCart);
    }

    @Test
    @DisplayName("removeProduct - должен обнулить totalPrice при удалении последнего товара")
    void removeProduct_ShouldZeroTotalPrice_WhenRemovingLastItem() {
        // Given
        CartItem item = TestDataBuilder.createCartItem(testCart, testProduct, 1);
        testCart.setItems(new ArrayList<>(List.of(item)));
        testCart.setTotalPrice(testProduct.getPrice());
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Cart result = cartService.removeProduct(1L, 1L);

        // Then
        assertThat(result.getItems()).isEmpty();
        assertThat(result.getTotalPrice()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(cartRepository).save(testCart);
    }

    // ==================== getCartItems Tests ====================

    @Test
    @DisplayName("getCartItems - должен вернуть список товаров в корзине")
    void getCartItems_ShouldReturnListOfCartItems() {
        // Given
        CartItem item1 = TestDataBuilder.createCartItem(testCart, testProduct, 2);
        Product product2 = TestDataBuilder.createProduct(2L, "Product 2", "Books", 
                new BigDecimal("50.00"), 30);
        CartItem item2 = TestDataBuilder.createCartItem(testCart, product2, 1);
        
        testCart.setItems(new ArrayList<>(List.of(item1, item2)));
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // When
        List<CartItem> items = cartService.getCartItems(1L);

        // Then
        assertThat(items).hasSize(2);
        assertThat(items).contains(item1, item2);
        verify(userRepository).findById(1L);
    }

    @Test
    @DisplayName("getCartItems - должен вернуть пустой список для пустой корзины")
    void getCartItems_ShouldReturnEmptyList_ForEmptyCart() {
        // Given
        testCart.setItems(new ArrayList<>());
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // When
        List<CartItem> items = cartService.getCartItems(1L);

        // Then
        assertThat(items).isEmpty();
        verify(userRepository).findById(1L);
    }

    @Test
    @DisplayName("getCartItems - должен выбросить исключение для несуществующего пользователя")
    void getCartItems_ShouldThrowException_WhenUserNotFound() {
        // Given
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> cartService.getCartItems(999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User not found");
        
        verify(userRepository).findById(999L);
    }

    // ==================== Edge Cases Tests ====================

    @Test
    @DisplayName("addProduct - должен корректно обработать добавление с нулевым количеством")
    void addProduct_ShouldHandleZeroQuantity() {
        // Given
        testCart.setItems(new ArrayList<>());
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Cart result = cartService.addProduct(1L, 1L, 0);

        // Then
        // Товар будет добавлен с количеством 0, что может быть валидным кейсом
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getQuantity()).isEqualTo(0);
        verify(cartRepository).save(testCart);
    }

    @Test
    @DisplayName("addProduct - должен корректно обработать добавление большого количества")
    void addProduct_ShouldHandleLargeQuantity() {
        // Given
        testCart.setItems(new ArrayList<>());
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(productRepository.findById(1L)).thenReturn(Optional.of(testProduct));
        when(cartRepository.save(any(Cart.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // When
        Cart result = cartService.addProduct(1L, 1L, 1000);

        // Then
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getQuantity()).isEqualTo(1000);
        verify(cartRepository).save(testCart);
    }
}
